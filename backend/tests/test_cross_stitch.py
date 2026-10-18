import numpy as np
import pytest

from app.modes.cross_stitch import (
    BackgroundNotInPalette,
    NothingToStitch,
    generate_cross_stitch,
)
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


def test_a_single_color_chart_uses_one_thread_for_every_stitch():
    chart = generate_cross_stitch(random_image(), grid_width=30, n_colors=1)

    assert len(chart.colors) == 1
    assert chart.colors[0].count == chart.total_stitches
    assert np.all(chart.grid == 0)


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


def drawing_image() -> np.ndarray:
    """A red square on a white background: one color of artwork plus a background."""
    image = np.full((80, 80, 3), 255, dtype=np.uint8)
    image[20:60, 20:60] = (255, 0, 0)
    return image


def test_without_the_option_the_background_stays_stitched():
    chart = generate_cross_stitch(drawing_image(), grid_width=20, n_colors=2)

    assert chart.background is None
    assert chart.grid.min() >= 0
    assert chart.total_stitches == 400


def test_the_detected_background_is_left_without_stitches():
    chart = generate_cross_stitch(
        drawing_image(), grid_width=20, n_colors=2, ignore_background=True
    )

    assert len(chart.colors) == 1
    assert chart.colors[0].count == 100
    assert chart.total_stitches == 100
    assert chart.background is not None
    assert chart.background.count == 300
    assert int(np.sum(chart.grid == -1)) == 300
    assert int(np.sum(chart.grid == 0)) == 100
    assert chart.width * chart.height == 400


def test_the_ignored_background_is_the_light_border_color():
    chart = generate_cross_stitch(
        drawing_image(), grid_width=20, n_colors=2, ignore_background=True
    )

    assert min(chart.background.rgb) > 200
    assert chart.colors[0].rgb[0] > 150 and chart.colors[0].rgb[1] < 100


def test_a_chosen_thread_can_be_the_background():
    plain = generate_cross_stitch(drawing_image(), grid_width=20, n_colors=2)
    red_code = plain.colors[1].code  # colors are ordered from light to dark

    chart = generate_cross_stitch(
        drawing_image(), grid_width=20, n_colors=2, background_code=red_code
    )

    assert chart.background.code == red_code
    assert chart.background.count == 100
    assert chart.colors[0].count == 300


def test_a_background_thread_that_is_not_in_the_chart_is_reported():
    with pytest.raises(BackgroundNotInPalette) as error:
        generate_cross_stitch(
            drawing_image(), grid_width=20, n_colors=2, background_code="NOPE"
        )

    assert error.value.code == "NOPE"
    assert len(error.value.available) == 2


def test_nothing_is_left_when_the_whole_image_is_background():
    with pytest.raises(NothingToStitch):
        generate_cross_stitch(
            drawing_image(), grid_width=20, n_colors=1, ignore_background=True
        )


def test_stitch_counts_exclude_the_background():
    chart = generate_cross_stitch(
        random_image(), grid_width=30, n_colors=6, ignore_background=True
    )

    stitched = int(np.sum(chart.grid >= 0))
    assert chart.total_stitches == stitched
    assert chart.total_stitches + chart.background.count == chart.width * chart.height
    assert [c.count for c in chart.colors] == np.bincount(
        chart.grid[chart.grid >= 0], minlength=len(chart.colors)
    ).tolist()


def test_ignoring_the_background_is_repeatable():
    first = generate_cross_stitch(drawing_image(), 20, 2, ignore_background=True)
    second = generate_cross_stitch(drawing_image(), 20, 2, ignore_background=True)

    assert np.array_equal(first.grid, second.grid)
    assert first.background == second.background
