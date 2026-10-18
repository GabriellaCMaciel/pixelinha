import numpy as np
import pytest

from app.services.imaging import grid_size, largest_grid_width, resize_to_grid


def make_image(height: int, width: int, color=(0, 0, 0)) -> np.ndarray:
    image = np.zeros((height, width, 3), dtype=np.uint8)
    image[:, :] = color
    return image


@pytest.mark.parametrize(
    ("width", "height", "grid_width", "expected"),
    [
        (100, 50, 10, (10, 5)),
        (50, 100, 10, (10, 20)),
        (100, 100, 25, (25, 25)),
        (100, 30, 10, (10, 3)),
    ],
)
def test_grid_size_keeps_aspect_ratio(width, height, grid_width, expected):
    assert grid_size(width, height, grid_width) == expected


def test_grid_size_height_is_never_below_one():
    assert grid_size(1000, 1, 10) == (10, 1)


@pytest.mark.parametrize("grid_width", [0, -5])
def test_grid_size_rejects_invalid_grid_width(grid_width):
    with pytest.raises(ValueError):
        grid_size(100, 100, grid_width)


@pytest.mark.parametrize(("width", "height"), [(0, 10), (10, 0)])
def test_grid_size_rejects_invalid_image_size(width, height):
    with pytest.raises(ValueError):
        grid_size(width, height, 10)


def test_resize_output_shape_matches_grid():
    result = resize_to_grid(make_image(60, 120), grid_width=30)

    assert result.shape == (15, 30, 3)
    assert result.dtype == np.uint8


def test_resize_shrinking_averages_covered_pixels():
    image = make_image(2, 2)
    image[0, 0] = (255, 0, 0)
    image[0, 1] = (0, 0, 0)
    image[1, 0] = (0, 0, 0)
    image[1, 1] = (255, 0, 0)

    result = resize_to_grid(image, grid_width=1)

    assert result.shape == (1, 1, 3)
    # Two red pixels out of four: the red channel averages to about half.
    assert 126 <= int(result[0, 0, 0]) <= 129
    assert result[0, 0, 1] == 0 and result[0, 0, 2] == 0


def test_resize_keeps_solid_color():
    result = resize_to_grid(make_image(80, 80, (10, 120, 200)), grid_width=8)

    assert np.all(result == (10, 120, 200))


def test_resize_can_enlarge_small_images():
    result = resize_to_grid(make_image(4, 4, (50, 50, 50)), grid_width=8)

    assert result.shape == (8, 8, 3)


def test_resize_rejects_non_rgb_arrays():
    with pytest.raises(ValueError):
        resize_to_grid(np.zeros((10, 10), dtype=np.uint8), grid_width=5)


def test_resize_rejects_wrong_dtype():
    with pytest.raises(ValueError):
        resize_to_grid(np.zeros((10, 10, 3), dtype=np.float32), grid_width=5)


@pytest.mark.parametrize(
    ("width", "height", "max_stitches", "expected"),
    [
        (100, 100, 100, 10),
        (400, 100, 200, 28),
        (100, 400, 200, 7),
        (1000, 1, 50, 50),
    ],
)
def test_largest_grid_width_respects_the_stitch_limit(width, height, max_stitches, expected):
    result = largest_grid_width(width, height, max_stitches)

    assert result == expected
    grid_w, grid_h = grid_size(width, height, result)
    assert grid_w * grid_h <= max_stitches
    if result > 1:
        next_w, next_h = grid_size(width, height, result + 1)
        assert next_w * next_h > max_stitches


def test_largest_grid_width_is_at_least_one():
    assert largest_grid_width(1, 10_000, 5) == 1


@pytest.mark.parametrize("args", [(0, 10, 10), (10, 0, 10), (10, 10, 0)])
def test_largest_grid_width_rejects_invalid_input(args):
    with pytest.raises(ValueError):
        largest_grid_width(*args)
