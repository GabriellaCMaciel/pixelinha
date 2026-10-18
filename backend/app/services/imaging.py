import io

import cv2
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

ALLOWED_FORMATS = frozenset({"PNG", "JPEG", "WEBP"})


class ImageDecodeError(ValueError):
    """The uploaded bytes could not be turned into a usable image."""


class UnsupportedImageFormat(ImageDecodeError):
    """The upload is not a PNG, JPEG or WEBP image."""


class ImageTooLarge(ImageDecodeError):
    """The image has more pixels than the service accepts."""


def decode_image(data: bytes, max_pixels: int) -> np.ndarray:
    """Decode an uploaded PNG, JPEG or WEBP into an RGB array (H x W x 3, uint8).

    The photo is turned upright using its EXIF orientation, and transparent areas
    are placed over a white background. The size is checked from the file header
    before the pixels are read, so a huge image cannot exhaust memory.
    """
    try:
        image = Image.open(io.BytesIO(data))
    except (UnidentifiedImageError, OSError):
        raise UnsupportedImageFormat("The file is not a valid image.") from None

    if image.format not in ALLOWED_FORMATS:
        raise UnsupportedImageFormat("Only PNG, JPEG and WEBP images are supported.")

    width, height = image.size
    if width * height > max_pixels:
        raise ImageTooLarge(
            f"The image has {width * height:,} pixels; the limit is {max_pixels:,}."
        )

    try:
        image.load()
        image = ImageOps.exif_transpose(image)
        image = image.convert("RGBA")
        background = Image.new("RGBA", image.size, (255, 255, 255, 255))
        rgb = Image.alpha_composite(background, image).convert("RGB")
    except (OSError, SyntaxError, ValueError):
        raise ImageDecodeError("The image file is corrupted or incomplete.") from None

    return np.asarray(rgb, dtype=np.uint8)


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
