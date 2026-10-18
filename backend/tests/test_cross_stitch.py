import numpy as np
import pytest

from app.modes.cross_stitch import generate_cross_stitch
from app.services.palette import Catalog, DmcColor


def quadrants_image() -> np.ndarray:
    image = np.zeros((80, 80, 3), dtype=np.uint8)
    image[:40, :40] = (255, 0, 0)
    image[:40, 40:] = (0, 160, 0)
    image[40:, :40] = (0, 0, 255)
    image[40:, 40:] = (255, 230, 0)
    return image


def random_image(seed: int = 0, height: int = 90, width: int = 120) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return rng.integers(0, 256, size=(height, width, 3), dtype=np.uint8)


def test_four_quadrants_give_four_threads_with_equal_counts():
    chart = generate_cross_stitch(quadrants_image(), grid_width=20, n_colors=4)

    assert (chart.width, chart.height) == (20, 20)
    assert len(chart.colors) == 4
    assert [c.count for c in chart.colors] == [100, 100, 100, 100]
    assert chart.total_stitches == 400


def test_grid_has_the_chart_dimensions_and_valid_indexes():
    chart = generate_cross_stitch(random_image(), grid_width=40, n_colors=8)

    assert chart.grid.shape == (chart.height, chart.width)
    assert chart.grid.min() >= 0
    assert chart.grid.max() < len(chart.colors)


def test_height_follows_the_aspect_ratio_of_the_image():
    chart = generate_cross_stitch(random_image(height=50, width=100), 20, 6)

    assert (chart.width, chart.height) == (20, 10)


def test_counts_match_the_grid_and_add_up_to_the_total():
    chart = generate_cross_stitch(random_image(), grid_width=40, n_colors=8)

    from_grid = np.bincount(chart.grid.ravel(), minlength=len(chart.colors)).tolist()
    assert [c.count for c in chart.colors] == from_grid
    assert sum(c.count for c in chart.colors) == chart.total_stitches


def test_every_thread_has_its_own_code_and_symbol():
    chart = generate_cross_stitch(random_image(), grid_width=40, n_colors=12)

    codes = [c.code for c in chart.colors]
    symbols = [c.symbol for c in chart.colors]
    assert len(set(codes)) == len(codes)
    assert len(set(symbols)) == len(symbols)


def test_never_uses_more_colors_than_requested():
    chart = generate_cross_stitch(random_image(), grid_width=40, n_colors=5)

    assert 1 <= len(chart.colors) <= 5


def test_a_two_color_image_gives_two_threads_even_if_more_are_requested():
    image = np.zeros((20, 20, 3), dtype=np.uint8)
    image[:, :10] = (255, 0, 0)
    image[:, 10:] = (0, 0, 255)

    chart = generate_cross_stitch(image, grid_width=10, n_colors=10)

    assert len(chart.colors) == 2


def test_the_same_input_gives_the_same_chart():
    image = random_image()

    first = generate_cross_stitch(image, grid_width=30, n_colors=7)
    second = generate_cross_stitch(image, grid_width=30, n_colors=7)

    assert np.array_equal(first.grid, second.grid)
    assert first.colors == second.colors


def test_a_custom_catalog_limits_the_available_threads():
    catalog = Catalog(
        [
            DmcColor("BLACK", "Black", "#000000", (0, 0, 0)),
            DmcColor("WHITE", "White", "#FFFFFF", (255, 255, 255)),
        ]
    )

    chart = generate_cross_stitch(random_image(), 30, 10, catalog=catalog)

    assert {c.code for c in chart.colors} <= {"BLACK", "WHITE"}


def test_invalid_parameters_are_reported():
    with pytest.raises(ValueError):
        generate_cross_stitch(random_image(), grid_width=0, n_colors=4)
    with pytest.raises(ValueError):
        generate_cross_stitch(random_image(), grid_width=20, n_colors=0)
