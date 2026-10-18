import io

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from pypdf import PdfReader

from app.core.config import Settings, get_settings
from app.main import app

URL = "/api/v1/cross-stitch/pdf"


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def png(size: int = 60) -> bytes:
    pixels = np.zeros((size, size, 3), dtype=np.uint8)
    pixels[:, : size // 2] = (220, 30, 40)
    pixels[:, size // 2 :] = (30, 60, 200)
    buffer = io.BytesIO()
    Image.fromarray(pixels).save(buffer, format="PNG")
    return buffer.getvalue()


def post(client, data: bytes | None = None, **form):
    return client.post(
        URL,
        files={"image": ("image.png", data if data is not None else png(), "image/png")},
        data={key: str(value) for key, value in form.items()},
    )


def test_returns_a_pdf_to_download(client):
    response = post(client, grid_width=30, n_colors=3)

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"].startswith("attachment;")
    assert response.content.startswith(b"%PDF")


def test_the_pdf_matches_the_requested_chart(client):
    response = post(client, grid_width=30, n_colors=3, fabric_count=18, title="Minha flor")

    cover = PdfReader(io.BytesIO(response.content)).pages[0].extract_text()
    assert "30 × 30 pontos" in cover
    assert "Aida 18" in cover
    assert "Minha flor" in cover


def test_the_file_is_named_after_the_title(client):
    response = post(client, grid_width=30, title="Coração da Vovó!")

    assert 'filename="coracao-da-vovo.pdf"' in response.headers["content-disposition"]


def test_a_missing_title_gets_a_plain_file_name(client):
    response = post(client, grid_width=30)

    assert 'filename="meu-grafico-de-ponto-cruz.pdf"' in response.headers["content-disposition"]


def test_black_and_white_is_accepted(client):
    assert post(client, grid_width=30, style="bw").status_code == 200


def test_an_unknown_style_is_refused_with_the_choices(client):
    response = post(client, grid_width=30, style="neon")

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail["code"] == "invalid_style"
    assert detail["allowed"] == ["color", "bw"]


def test_an_unknown_fabric_count_is_refused(client):
    response = post(client, grid_width=30, fabric_count=13)

    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "invalid_fabric_count"


def test_chart_errors_are_reported_like_the_preview_does(client):
    too_wide = post(client, grid_width=5000)
    corrupted = post(client, data=b"not an image")

    assert too_wide.status_code == 422
    assert too_wide.json()["detail"]["code"] == "invalid_grid_width"
    assert corrupted.status_code == 415 or corrupted.status_code == 400


def test_respects_the_configured_limits(client):
    settings = Settings(max_upload_bytes=100)
    app.dependency_overrides[get_settings] = lambda: settings

    response = post(client, grid_width=30)

    assert response.status_code == 413
    assert response.json()["detail"]["code"] == "file_too_large"
