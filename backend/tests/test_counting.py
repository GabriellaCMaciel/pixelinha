import numpy as np
import pytest

from app.services.counting import count_stitches


def test_counts_each_color():
    labels = np.array([[0, 1], [1, 1]])

    assert count_stitches(labels, n_colors=2) == [1, 3]


def test_unused_colors_count_as_zero():
    labels = np.zeros((3, 3), dtype=np.int64)

    assert count_stitches(labels, n_colors=3) == [9, 0, 0]


def test_counts_add_up_to_the_total_number_of_stitches():
    rng = np.random.default_rng(1)
    labels = rng.integers(0, 6, size=(25, 40))

    counts = count_stitches(labels, n_colors=6)

    assert len(counts) == 6
    assert sum(counts) == 25 * 40


def test_counts_are_plain_python_ints():
    counts = count_stitches(np.array([[0, 1]]), n_colors=2)

    assert all(type(count) is int for count in counts)


def test_empty_grid_gives_all_zeros():
    counts = count_stitches(np.empty((0, 0), dtype=np.int64), n_colors=2)

    assert counts == [0, 0]


def test_rejects_labels_outside_the_palette():
    with pytest.raises(ValueError):
        count_stitches(np.array([[0, 2]]), n_colors=2)
    with pytest.raises(ValueError):
        count_stitches(np.array([[-1, 0]]), n_colors=2)


def test_rejects_non_integer_labels():
    with pytest.raises(ValueError):
        count_stitches(np.array([[0.0, 1.0]]), n_colors=2)


def test_rejects_invalid_number_of_colors():
    with pytest.raises(ValueError):
        count_stitches(np.array([[0]]), n_colors=0)
