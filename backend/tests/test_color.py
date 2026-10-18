import numpy as np
import pytest

from app.services.color import lab_to_rgb, rgb_to_lab


def lab_of(r: int, g: int, b: int) -> np.ndarray:
    return rgb_to_lab(np.array([r, g, b], dtype=np.uint8))


def test_white_is_light_and_neutral():
    lab = lab_of(255, 255, 255)

    assert lab[0] == pytest.approx(100, abs=0.5)
    assert lab[1] == pytest.approx(0, abs=0.5)
    assert lab[2] == pytest.approx(0, abs=0.5)


def test_black_has_zero_lightness():
    lab = lab_of(0, 0, 0)

    assert lab[0] == pytest.approx(0, abs=0.5)


def test_pure_red_matches_reference_values():
    lab = lab_of(255, 0, 0)

    assert lab[0] == pytest.approx(53.2, abs=1.0)
    assert lab[1] == pytest.approx(80.1, abs=1.5)
    assert lab[2] == pytest.approx(67.2, abs=1.5)


def test_round_trip_returns_the_same_colors():
    rng = np.random.default_rng(0)
    rgb = rng.integers(0, 256, size=(20, 30, 3), dtype=np.uint8)

    restored = lab_to_rgb(rgb_to_lab(rgb))

    assert restored.shape == rgb.shape
    assert restored.dtype == np.uint8
    assert np.max(np.abs(restored.astype(int) - rgb.astype(int))) <= 1


def test_shape_is_preserved_for_any_leading_dimensions():
    assert rgb_to_lab(np.zeros((3, 3), dtype=np.uint8)).shape == (3, 3)
    assert rgb_to_lab(np.zeros((4, 5, 3), dtype=np.uint8)).shape == (4, 5, 3)
    assert rgb_to_lab(np.zeros((7, 3), dtype=np.uint8)).shape == (7, 3)


def test_lab_to_rgb_clips_out_of_gamut_values():
    result = lab_to_rgb(np.array([[50.0, 127.0, -128.0]], dtype=np.float32))

    assert result.dtype == np.uint8
    assert result.min() >= 0 and result.max() <= 255


def test_empty_input_returns_empty_output():
    assert rgb_to_lab(np.empty((0, 3), dtype=np.uint8)).shape == (0, 3)
    assert lab_to_rgb(np.empty((0, 3), dtype=np.float32)).shape == (0, 3)


def test_rgb_to_lab_rejects_wrong_dtype():
    with pytest.raises(ValueError):
        rgb_to_lab(np.zeros((2, 3), dtype=np.float32))


@pytest.mark.parametrize("func", [rgb_to_lab, lab_to_rgb])
def test_rejects_arrays_without_three_channels(func):
    with pytest.raises(ValueError):
        func(np.zeros((4, 2), dtype=np.uint8))
