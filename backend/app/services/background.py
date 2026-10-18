import numpy as np

from app.services.palette import DmcColor, MatchedPalette

# Label of a cell that is left without a stitch (the bare fabric).
UNSTITCHED = -1


def detect_background_index(labels: np.ndarray) -> int:
    """Guess which palette color is the background: the one most common on the border.

    `labels` is the (height, width) grid of palette indices. Drawings, logos and
    cut-out photos usually have the background all around the edge. On a tie the
    lowest index wins, which is the lightest thread because palettes are ordered
    from light to dark.
    """
    if labels.ndim != 2 or labels.size == 0:
        raise ValueError("Expected a non-empty 2D grid of labels.")

    border = np.concatenate([labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]])
    return int(np.argmax(np.bincount(border)))


def remove_background(
    palette: MatchedPalette, index: int
) -> tuple[MatchedPalette, DmcColor]:
    """Leave one palette color unstitched.

    Returns the palette without that color, where its cells are marked
    UNSTITCHED and the remaining colors are renumbered, plus the removed color.
    """
    if not 0 <= index < len(palette.colors):
        raise ValueError("Background index is outside the palette.")

    background = palette.colors[index]
    kept = [i for i in range(len(palette.colors)) if i != index]

    new_index = np.full(len(palette.colors), UNSTITCHED, dtype=np.int64)
    new_index[kept] = np.arange(len(kept))

    stitched = MatchedPalette(
        labels=new_index[palette.labels],
        colors=[palette.colors[i] for i in kept],
    )
    return stitched, background
