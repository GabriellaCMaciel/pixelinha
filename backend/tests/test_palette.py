import numpy as np
import pytest

from app.services.color import rgb_to_lab
from app.services.palette import Catalog, DmcColor, load_dmc_catalog


def color(code: str, rgb: tuple[int, int, int]) -> DmcColor:
    r, g, b = rgb
    return DmcColor(code=code, name=f"Color {code}", hex=f"#{r:02X}{g:02X}{b:02X}", rgb=rgb)


def small_catalog() -> Catalog:
    return Catalog(
        [
            color("RED", (255, 0, 0)),
            color("GREEN", (0, 255, 0)),
            color("BLUE", (0, 0, 255)),
        ]
    )


def lab_of(*rgb_values: tuple[int, int, int]) -> np.ndarray:
    return rgb_to_lab(np.array(rgb_values, dtype=np.uint8))


def test_nearest_picks_the_closest_color():
    catalog = small_catalog()

    result = catalog.nearest(lab_of((250, 10, 10), (5, 240, 20), (30, 30, 220)))

    assert result.tolist() == [0, 1, 2]


def test_nearest_returns_one_index_per_input_color():
    result = small_catalog().nearest(lab_of((1, 2, 3), (4, 5, 6)))

    assert result.shape == (2,)


def test_nearest_prefers_the_first_entry_on_ties():
    catalog = Catalog([color("A", (10, 20, 30)), color("B", (10, 20, 30))])

    assert catalog.nearest(lab_of((10, 20, 30))).tolist() == [0]


def test_nearest_rejects_wrong_shape():
    with pytest.raises(ValueError):
        small_catalog().nearest(np.zeros((3,), dtype=np.float32))


def test_empty_catalog_is_rejected():
    with pytest.raises(ValueError):
        Catalog([])


def test_bundled_dmc_catalog_is_loaded():
    catalog = load_dmc_catalog()

    assert len(catalog) == 489
    codes = [c.code for c in catalog.colors]
    assert len(set(codes)) == len(codes)
    assert catalog.lab.shape == (489, 3)
    assert catalog.rgb.shape == (489, 3)


def test_bundled_catalog_is_cached():
    assert load_dmc_catalog() is load_dmc_catalog()


def test_every_dmc_color_matches_itself():
    catalog = load_dmc_catalog()

    result = catalog.nearest(catalog.lab)

    # Some threads can share an RGB value, so compare colors, not positions.
    assert np.array_equal(catalog.rgb[result], catalog.rgb)


def test_a_slightly_off_color_still_maps_to_its_dmc_thread():
    catalog = load_dmc_catalog()
    original = catalog.rgb[100].astype(int)
    shifted = np.clip(original + 2, 0, 255).astype(np.uint8)

    result = catalog.nearest(rgb_to_lab(shifted[None, :]))

    assert np.array_equal(catalog.rgb[result[0]], catalog.rgb[100])
