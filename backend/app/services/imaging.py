import cv2
import numpy as np


def grid_size(width: int, height: int, grid_width: int) -> tuple[int, int]:
    """Return (grid_width, grid_height) keeping the aspect ratio of the image.

    The height is rounded to the nearest whole stitch and is never below 1.
    """
    if width < 1 or height < 1:
        raise ValueError("Image dimensions must be positive.")
    if grid_width < 1:
        raise ValueError("Grid width must be at least 1.")

    grid_height = max(1, round(height * grid_width / width))
    return grid_width, grid_height


def resize_to_grid(image: np.ndarray, grid_width: int) -> np.ndarray:
    """Resize an RGB image (H x W x 3, uint8) to the stitch grid.

    One pixel of the result is one stitch. When shrinking, area interpolation
    averages the source pixels each stitch covers, which keeps colors faithful.
    """
    if image.ndim != 3 or image.shape[2] != 3:
        raise ValueError("Expected an RGB image with shape (height, width, 3).")
    if image.dtype != np.uint8:
        raise ValueError("Expected an image with dtype uint8.")

    height, width = image.shape[:2]
    new_width, new_height = grid_size(width, height, grid_width)

    shrinking = new_width <= width and new_height <= height
    interpolation = cv2.INTER_AREA if shrinking else cv2.INTER_LINEAR
    return cv2.resize(image, (new_width, new_height), interpolation=interpolation)
