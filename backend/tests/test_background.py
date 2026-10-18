import numpy as np
import pytest

from app.services.background import (
    UNSTITCHED,
    detect_background_index,
    remove_background,
)
from app.services.palette import DmcColor, MatchedPalette


def thread(code: str) -> DmcColor:
    return DmcColor(code=code, name=f"Thread {code}", hex="#000000", rgb=(0, 0, 0))


def test_the_most_common_border_color_is_the_background():
    labels = np.array(
        [
            [2, 2, 2, 2],
            [2, 0, 1, 2],
            [2, 1, 0, 2],
            [2, 2, 2, 2],
        ]
    )

    assert detect_background_index(labels) == 2


def test_the_center_does_not_count_as_background():
    # Color 0 fills the whole interior, but the border is color 1.
    labels = np.ones((7, 7), dtype=np.int64)
    labels[1:-1, 1:-1] = 0

    assert detect_background_index(labels) == 1


def test_a_tie_goes_to_the_lowest_index():
    labels = np.array([[0, 1], [1, 0]])

    assert detect_background_index(labels) == 0


def test_a_single_cell_grid_works():
    assert detect_background_index(np.array([[3]])) == 3


def test_a_single_row_grid_works():
    assert detect_background_index(np.array([[1, 1, 0, 1]])) == 1


@pytest.mark.parametrize(
    "labels", [np.zeros((3,), dtype=np.int64), np.empty((0, 0), dtype=np.int64)]
)
def test_invalid_grids_are_rejected(labels):
    with pytest.raises(ValueError):
        detect_background_index(labels)


def test_removing_a_color_marks_its_cells_as_unstitched_and_renumbers_the_rest():
    palette = MatchedPalette(
        labels=np.array([[0, 1, 2]]),
        colors=[thread("A"), thread("B"), thread("C")],
    )

    stitched, background = remove_background(palette, 1)

    assert background.code == "B"
    assert [c.code for c in stitched.colors] == ["A", "C"]
    assert stitched.labels.tolist() == [[0, UNSTITCHED, 1]]


def test_removing_the_first_and_last_colors():
    palette = MatchedPalette(
        labels=np.array([[0, 1, 2]]),
        colors=[thread("A"), thread("B"), thread("C")],
    )

    first, _ = remove_background(palette, 0)
    last, _ = remove_background(palette, 2)

    assert first.labels.tolist() == [[UNSTITCHED, 0, 1]]
    assert last.labels.tolist() == [[0, 1, UNSTITCHED]]


def test_removing_the_only_color_leaves_nothing_to_stitch():
    palette = MatchedPalette(labels=np.zeros((2, 2), dtype=np.int64), colors=[thread("A")])

    stitched, background = remove_background(palette, 0)

    assert background.code == "A"
    assert stitched.colors == []
    assert np.all(stitched.labels == UNSTITCHED)


def test_the_original_palette_is_not_modified():
    labels = np.array([[0, 1]])
    palette = MatchedPalette(labels=labels, colors=[thread("A"), thread("B")])

    remove_background(palette, 0)

    assert labels.tolist() == [[0, 1]]
    assert len(palette.colors) == 2


@pytest.mark.parametrize("index", [-1, 2])
def test_an_index_outside_the_palette_is_rejected(index):
    palette = MatchedPalette(labels=np.array([[0, 1]]), colors=[thread("A"), thread("B")])

    with pytest.raises(ValueError):
        remove_background(palette, index)
