import numpy as np
import pytest

from app.services.color import rgb_to_lab
from app.services.quantization import quantize_colors


def two_color_image() -> np.ndarray:
    image = np.zeros((10, 20, 3), dtype=np.uint8)
    image[:, :10] = (255, 0, 0)
    image[:, 10:] = (0, 0, 255)
    return image


def noisy_image(seed: int = 0, size: int = 30) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return rng.integers(0, 256, size=(size, size, 3), dtype=np.uint8)


def test_two_color_image_is_split_into_its_two_regions():
    result = quantize_colors(two_color_image(), n_colors=2)

    assert len(result.centers_lab) == 2
    left, right = result.labels[:, :10], result.labels[:, 10:]
    assert len(np.unique(left)) == 1
    assert len(np.unique(right)) == 1
    assert left[0, 0] != right[0, 0]


def test_cluster_centers_are_close_to_the_original_colors():
    result = quantize_colors(two_color_image(), n_colors=2)

    expected = rgb_to_lab(np.array([[255, 0, 0], [0, 0, 255]], dtype=np.uint8))
    for center in result.centers_lab:
        distances = np.linalg.norm(expected - center, axis=1)
        assert distances.min() < 1.0


def test_centers_are_ordered_from_lightest_to_darkest():
    result = quantize_colors(noisy_image(), n_colors=6)

    lightness = result.centers_lab[:, 0]
    assert np.all(np.diff(lightness) <= 0)


def test_labels_match_image_shape_and_stay_in_range():
    image = noisy_image()
    result = quantize_colors(image, n_colors=5)

    assert result.labels.shape == image.shape[:2]
    assert np.issubdtype(result.labels.dtype, np.integer)
    assert result.labels.min() >= 0
    assert result.labels.max() < len(result.centers_lab)


def test_returns_requested_number_of_colors_when_image_has_enough():
    result = quantize_colors(noisy_image(), n_colors=5)

    assert len(result.centers_lab) == 5
    assert len(np.unique(result.labels)) == 5


def test_uses_fewer_clusters_when_image_has_fewer_distinct_colors():
    image = np.zeros((6, 6, 3), dtype=np.uint8)
    image[:2] = (10, 20, 30)
    image[2:4] = (200, 100, 50)
    image[4:] = (90, 90, 250)

    result = quantize_colors(image, n_colors=10)

    assert len(result.centers_lab) == 3
    assert len(np.unique(result.labels)) == 3


def test_single_color_request_gives_one_cluster_at_the_mean():
    image = noisy_image()
    result = quantize_colors(image, n_colors=1)

    assert len(result.centers_lab) == 1
    assert np.all(result.labels == 0)
    expected_mean = rgb_to_lab(image.reshape(-1, 3)).mean(axis=0)
    assert np.allclose(result.centers_lab[0], expected_mean, atol=1e-3)


def test_single_pixel_image_works():
    image = np.array([[[12, 34, 56]]], dtype=np.uint8)

    result = quantize_colors(image, n_colors=4)

    assert result.labels.shape == (1, 1)
    assert len(result.centers_lab) == 1


def test_same_input_gives_same_output():
    image = noisy_image()

    first = quantize_colors(image, n_colors=7)
    second = quantize_colors(image, n_colors=7)

    assert np.array_equal(first.labels, second.labels)
    assert np.array_equal(first.centers_lab, second.centers_lab)


@pytest.mark.parametrize("n_colors", [0, -3])
def test_rejects_invalid_number_of_colors(n_colors):
    with pytest.raises(ValueError):
        quantize_colors(noisy_image(), n_colors=n_colors)


def test_rejects_non_rgb_arrays():
    with pytest.raises(ValueError):
        quantize_colors(np.zeros((10, 10), dtype=np.uint8), n_colors=2)


def test_rejects_wrong_dtype():
    with pytest.raises(ValueError):
        quantize_colors(np.zeros((10, 10, 3), dtype=np.float32), n_colors=2)
