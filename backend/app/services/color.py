import cv2
import numpy as np


def _check_last_axis(array: np.ndarray) -> None:
    if array.ndim < 1 or array.shape[-1] != 3:
        raise ValueError("Expected an array whose last axis has 3 channels.")


def rgb_to_lab(rgb: np.ndarray) -> np.ndarray:
    """Convert uint8 RGB values (..., 3) to CIE Lab as float32.

    L ranges from 0 to 100, while a and b are roughly in [-128, 127].
    Distances in Lab follow human color perception better than in RGB.
    """
    rgb = np.asarray(rgb)
    _check_last_axis(rgb)
    if rgb.dtype != np.uint8:
        raise ValueError("Expected RGB values with dtype uint8.")
    if rgb.size == 0:
        return np.empty(rgb.shape, dtype=np.float32)

    flat = rgb.reshape(1, -1, 3).astype(np.float32) / 255.0
    lab = cv2.cvtColor(flat, cv2.COLOR_RGB2LAB)
    return lab.reshape(rgb.shape)


def lab_to_rgb(lab: np.ndarray) -> np.ndarray:
    """Convert CIE Lab values (..., 3) back to uint8 RGB, clipped to the valid range."""
    lab = np.asarray(lab, dtype=np.float32)
    _check_last_axis(lab)
    if lab.size == 0:
        return np.empty(lab.shape, dtype=np.uint8)

    flat = lab.reshape(1, -1, 3)
    rgb = cv2.cvtColor(flat, cv2.COLOR_LAB2RGB)
    rgb = np.clip(np.rint(rgb * 255.0), 0, 255).astype(np.uint8)
    return rgb.reshape(lab.shape)
