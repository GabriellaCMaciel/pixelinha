import io

import numpy as np
import pytest
from PIL import Image

from app.services.imaging import (
    ImageDecodeError,
    ImageTooLarge,
    UnsupportedImageFormat,
    decode_image,
)

MAX_PIXELS = 1_000_000


def encode(image: Image.Image, fmt: str, **options) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format=fmt, **options)
    return buffer.getvalue()


def solid(size=(8, 6), color=(10, 120, 200), mode="RGB") -> Image.Image:
    return Image.new(mode, size, color)


def test_png_is_decoded_to_an_rgb_array():
    result = decode_image(encode(solid(), "PNG"), MAX_PIXELS)

    assert result.shape == (6, 8, 3)
    assert result.dtype == np.uint8
    assert np.all(result == (10, 120, 200))


def test_jpeg_is_decoded():
    result = decode_image(encode(solid(size=(16, 16)), "JPEG", quality=100), MAX_PIXELS)

    assert result.shape == (16, 16, 3)
    assert np.abs(result.astype(int) - (10, 120, 200)).max() <= 4


def test_webp_is_decoded():
    result = decode_image(encode(solid(), "WEBP", lossless=True), MAX_PIXELS)

    assert result.shape == (6, 8, 3)
    assert np.all(result == (10, 120, 200))


def test_grayscale_images_become_rgb():
    result = decode_image(encode(Image.new("L", (5, 5), 100), "PNG"), MAX_PIXELS)

    assert result.shape == (5, 5, 3)
    assert np.all(result == 100)


def test_transparent_pixels_are_placed_over_white():
    image = solid(size=(2, 1), color=(255, 0, 0, 255), mode="RGBA")
    image.putpixel((1, 0), (255, 0, 0, 0))

    result = decode_image(encode(image, "PNG"), MAX_PIXELS)

    assert tuple(result[0, 0]) == (255, 0, 0)
    assert tuple(result[0, 1]) == (255, 255, 255)


def test_semi_transparent_pixels_blend_with_white():
    image = solid(size=(1, 1), color=(0, 0, 0, 128), mode="RGBA")

    result = decode_image(encode(image, "PNG"), MAX_PIXELS)

    assert 125 <= int(result[0, 0, 0]) <= 130


def test_exif_orientation_turns_the_photo_upright():
    exif = Image.Exif()
    exif[0x0112] = 6  # the camera was rotated, so the pixels must be turned
    image = solid(size=(40, 20))

    result = decode_image(encode(image, "JPEG", exif=exif), MAX_PIXELS)

    assert result.shape == (40, 20, 3)


def test_unsupported_format_is_rejected():
    with pytest.raises(UnsupportedImageFormat):
        decode_image(encode(solid(), "BMP"), MAX_PIXELS)


def test_non_image_bytes_are_rejected():
    with pytest.raises(UnsupportedImageFormat):
        decode_image(b"this is not an image", MAX_PIXELS)


def test_empty_upload_is_rejected():
    with pytest.raises(UnsupportedImageFormat):
        decode_image(b"", MAX_PIXELS)


def test_image_with_too_many_pixels_is_rejected():
    with pytest.raises(ImageTooLarge):
        decode_image(encode(solid(size=(20, 20)), "PNG"), max_pixels=100)


def test_image_exactly_at_the_limit_is_accepted():
    result = decode_image(encode(solid(size=(10, 10)), "PNG"), max_pixels=100)

    assert result.shape == (10, 10, 3)


def test_truncated_file_is_reported_as_corrupted():
    rng = np.random.default_rng(0)
    noise = Image.fromarray(rng.integers(0, 256, size=(64, 64, 3), dtype=np.uint8))
    data = encode(noise, "PNG")

    with pytest.raises(ImageDecodeError) as error:
        decode_image(data[: len(data) // 2], MAX_PIXELS)

    assert not isinstance(error.value, (UnsupportedImageFormat, ImageTooLarge))
