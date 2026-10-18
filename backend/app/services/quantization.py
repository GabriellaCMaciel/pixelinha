from dataclasses import dataclass

import numpy as np
from sklearn.cluster import KMeans

from app.services.color import rgb_to_lab

DEFAULT_SEED = 42


@dataclass(frozen=True)
class Quantized:
    """Result of reducing an image to a small set of colors.

    labels: (height, width) array with the cluster index of every stitch.
    centers_lab: (n_clusters, 3) float32 array with each cluster color in Lab,
        ordered from the lightest to the darkest so the output is stable.
    """

    labels: np.ndarray
    centers_lab: np.ndarray


def quantize_colors(
    image: np.ndarray, n_colors: int, seed: int = DEFAULT_SEED
) -> Quantized:
    """Reduce an RGB image (H x W x 3, uint8) to at most `n_colors` colors.

    Colors are grouped with k-means in Lab space, where distances match what the
    eye sees. The same image and parameters always give the same result.
    If the image has fewer distinct colors than requested, fewer clusters are used.
    """
    if image.ndim != 3 or image.shape[2] != 3:
        raise ValueError("Expected an RGB image with shape (height, width, 3).")
    if image.dtype != np.uint8:
        raise ValueError("Expected an image with dtype uint8.")
    if n_colors < 1:
        raise ValueError("Number of colors must be at least 1.")

    height, width = image.shape[:2]
    pixels = image.reshape(-1, 3)
    n_distinct = len(np.unique(pixels, axis=0))
    n_clusters = min(n_colors, n_distinct)

    lab = rgb_to_lab(pixels)

    if n_clusters == 1:
        labels = np.zeros(len(lab), dtype=np.int64)
        centers = lab.mean(axis=0, keepdims=True)
    else:
        model = KMeans(n_clusters=n_clusters, n_init=10, random_state=seed)
        labels = model.fit_predict(lab)
        centers = model.cluster_centers_

    # Drop any empty cluster and sort the rest from lightest to darkest.
    used = np.unique(labels)
    centers = centers[used]
    order = np.argsort(-centers[:, 0], kind="stable")
    new_index = np.empty(len(used), dtype=np.int64)
    new_index[order] = np.arange(len(used))
    labels = new_index[np.searchsorted(used, labels)]

    return Quantized(
        labels=labels.reshape(height, width),
        centers_lab=centers[order].astype(np.float32),
    )
