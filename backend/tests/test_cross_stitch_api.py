import io

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.core.config import Settings, get_settings
from app.main import app

URL = "/api/v1/cross-stitch/preview"


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def use_settings(**limits) -> None:
    settings = Settings(**limits)
    app.dependency_overrides[get_settings] = lambda: settings


def encode(image: Image.Image, fmt: str = "PNG") -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format=fmt)
    return buffer.getvalue()


def quadrants(size: int = 80) -> Image.Image:
    half = size // 2
    pixels = np.zeros((size, size, 3), dtype=np.uint8)
    pixels[:half, :half] = (255, 0, 0)
    pixels[:half, half:] = (0, 160, 0)
    pixels[half:, :half] = (0, 0, 255)
    pixels[half:, half:] = (255, 230, 0)
    return Image.fromarray(pixels)


def post(client, data: bytes, filename="image.png", **form):
    return client.post(
        URL,
        files={"image": (filename, data, "application/octet-stream")},
        data={key: str(value) for key, value in form.items()},
    )


def error_of(response) -> dict:
    return response.json()["detail"]


def test_a_valid_image_returns_a_chart(client):
    response = post(client, encode(quadrants()), grid_width=20, n_colors=4)

    assert response.status_code == 200
    body = response.json()
    assert (body["width"], body["height"]) == (20, 20)
    assert body["total_stitches"] == 400
    assert len(body["colors"]) == 4
    assert [color["count"] for color in body["colors"]] == [100, 100, 100, 100]


def test_the_grid_has_height_rows_of_width_indexes(client):
    body = post(client, encode(quadrants()), grid_width=20, n_colors=4).json()

    assert len(body["grid"]) == body["height"]
    assert all(len(row) == body["width"] for row in body["grid"])
    flat = [index for row in body["grid"] for index in row]
    assert min(flat) >= 0 and max(flat) < len(body["colors"])


def test_each_color_describes_a_thread_with_a_symbol(client):
    body = post(client, encode(quadrants()), grid_width=20, n_colors=4).json()

    for color in body["colors"]:
        assert set(color) == {"code", "name", "hex", "rgb", "symbol", "count"}
        assert len(color["rgb"]) == 3
        assert len(color["symbol"]) == 1
    symbols = [color["symbol"] for color in body["colors"]]
    assert len(set(symbols)) == len(symbols)


def test_defaults_are_used_when_parameters_are_missing(client):
    response = post(client, encode(quadrants()))

    assert response.status_code == 200
    assert response.json()["width"] == 100


def test_jpeg_uploads_work(client):
    response = post(client, encode(quadrants(), "JPEG"), filename="photo.jpg", grid_width=20)

    assert response.status_code == 200


@pytest.mark.parametrize("grid_width", [5, 301])
def test_grid_width_outside_the_limits_is_rejected(client, grid_width):
    response = post(client, encode(quadrants()), grid_width=grid_width)

    assert response.status_code == 422
    detail = error_of(response)
    assert detail["code"] == "invalid_grid_width"
    assert detail["min"] == 10 and detail["max"] == 300


@pytest.mark.parametrize("n_colors", [0, -1, 41])
def test_number_of_colors_outside_the_limits_is_rejected(client, n_colors):
    response = post(client, encode(quadrants()), n_colors=n_colors)

    assert response.status_code == 422
    detail = error_of(response)
    assert detail["code"] == "invalid_colors"
    assert detail["min"] == 1 and detail["max"] == 40


def test_a_single_color_chart_is_allowed(client):
    response = post(client, encode(quadrants()), grid_width=20, n_colors=1)

    assert response.status_code == 200
    body = response.json()
    assert len(body["colors"]) == 1
    assert body["colors"][0]["count"] == body["total_stitches"] == 400
    assert all(index == 0 for row in body["grid"] for index in row)


def test_a_missing_image_is_rejected(client):
    response = client.post(URL, data={"grid_width": "20"})

    assert response.status_code == 422


def test_a_file_that_is_not_an_image_gets_415(client):
    response = post(client, b"just some text", filename="notes.txt")

    assert response.status_code == 415
    assert error_of(response)["code"] == "unsupported_format"


def test_an_unsupported_image_format_gets_415(client):
    response = post(client, encode(quadrants(), "BMP"), filename="image.bmp")

    assert response.status_code == 415


def test_a_corrupted_image_gets_400(client):
    rng = np.random.default_rng(0)
    noise = Image.fromarray(rng.integers(0, 256, size=(64, 64, 3), dtype=np.uint8))
    data = encode(noise)

    response = post(client, data[: len(data) // 2])

    assert response.status_code == 400
    assert error_of(response)["code"] == "corrupted_image"


def test_a_file_over_the_upload_limit_gets_413(client):
    use_settings(max_upload_bytes=500)

    response = post(client, encode(quadrants(200)), grid_width=20)

    assert response.status_code == 413
    assert error_of(response)["code"] == "file_too_large"


def test_an_image_with_too_many_pixels_gets_413(client):
    use_settings(max_image_pixels=100)

    response = post(client, encode(quadrants(40)), grid_width=20)

    assert response.status_code == 413
    assert error_of(response)["code"] == "image_too_large"


def test_a_chart_with_too_many_stitches_suggests_a_smaller_width(client):
    use_settings(max_stitches=100)

    response = post(client, encode(quadrants()), grid_width=20)

    assert response.status_code == 422
    detail = error_of(response)
    assert detail["code"] == "too_many_stitches"
    assert detail["max_grid_width"] == 10
    assert detail["max_stitches"] == 100

    # The suggested width really is accepted.
    retry = post(client, encode(quadrants()), grid_width=detail["max_grid_width"])
    assert retry.status_code == 200


def test_the_stitch_limit_depends_on_the_image_shape(client):
    use_settings(max_stitches=200)
    wide = Image.new("RGB", (400, 100), (200, 50, 50))

    response = post(client, encode(wide), grid_width=40)

    # A 4:1 image at 40 stitches wide needs 40 x 10 = 400 stitches, above the limit of 200.
    assert response.status_code == 422
    assert error_of(response)["max_grid_width"] == 28


def test_the_same_upload_gives_the_same_chart(client):
    data = encode(quadrants())

    first = post(client, data, grid_width=20, n_colors=4).json()
    second = post(client, data, grid_width=20, n_colors=4).json()

    assert first == second
