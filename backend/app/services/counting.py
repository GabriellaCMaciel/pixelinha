import numpy as np


def count_stitches(labels: np.ndarray, n_colors: int) -> list[int]:
    """Count how many stitches each palette color has.

    `labels` is the (height, width) grid of palette indices. The result has one
    entry per color, including zeros for colors that never appear, and its sum
    is the total number of stitches in the grid.
    """
    if n_colors < 1:
        raise ValueError("Number of colors must be at least 1.")
    if not np.issubdtype(labels.dtype, np.integer):
        raise ValueError("Expected integer labels.")
    if labels.size and (labels.min() < 0 or labels.max() >= n_colors):
        raise ValueError("Labels must be between 0 and n_colors - 1.")

    return np.bincount(labels.ravel(), minlength=n_colors).tolist()
