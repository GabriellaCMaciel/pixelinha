"""Reading and checking what a chart request sends, shared by every chart route."""

from fastapi import UploadFile

from app.core.config import Settings
from app.core.errors import api_error
from app.modes.cross_stitch import (
    BackgroundNotInPalette,
    CrossStitchChart,
    NothingToStitch,
    generate_cross_stitch,
)
from app.services.imaging import (
    ImageDecodeError,
    ImageTooLarge,
    UnsupportedImageFormat,
    decode_image,
    grid_size,
    largest_grid_width,
)

DEFAULT_GRID_WIDTH = 100
DEFAULT_COLORS = 16


def _within(value: int, low: int, high: int) -> int:
    return max(low, min(value, high))


def build_chart(
    image: UploadFile,
    grid_width: int | None,
    n_colors: int | None,
    ignore_background: bool,
    background_code: str | None,
    settings: Settings,
) -> CrossStitchChart:
    """Validate the request and turn the uploaded image into a chart.

    Raises an HTTP error with a stable `code` for anything the person can fix.
    """
    background_code = (background_code or "").strip() or None

    if grid_width is None:
        grid_width = _within(DEFAULT_GRID_WIDTH, settings.min_grid_width, settings.max_grid_width)
    if n_colors is None:
        n_colors = _within(DEFAULT_COLORS, settings.min_colors, settings.max_colors)

    if not settings.min_grid_width <= grid_width <= settings.max_grid_width:
        raise api_error(
            422,
            "invalid_grid_width",
            f"Grid width must be between {settings.min_grid_width} and {settings.max_grid_width}.",
            min=settings.min_grid_width,
            max=settings.max_grid_width,
        )
    if not settings.min_colors <= n_colors <= settings.max_colors:
        raise api_error(
            422,
            "invalid_colors",
            f"Number of colors must be between {settings.min_colors} and {settings.max_colors}.",
            min=settings.min_colors,
            max=settings.max_colors,
        )

    # Read one byte past the limit so an oversized upload is detected without
    # loading all of it into memory.
    data = image.file.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise api_error(
            413,
            "file_too_large",
            f"The file is larger than {settings.max_upload_bytes // (1024 * 1024)} MB.",
            max_bytes=settings.max_upload_bytes,
        )

    try:
        pixels = decode_image(data, settings.max_image_pixels)
    except UnsupportedImageFormat as error:
        raise api_error(415, "unsupported_format", str(error)) from None
    except ImageTooLarge as error:
        raise api_error(413, "image_too_large", str(error)) from None
    except ImageDecodeError as error:
        raise api_error(400, "corrupted_image", str(error)) from None

    height, width = pixels.shape[:2]
    chart_width, chart_height = grid_size(width, height, grid_width)
    if chart_width * chart_height > settings.max_stitches:
        allowed = min(
            largest_grid_width(width, height, settings.max_stitches),
            settings.max_grid_width,
        )
        raise api_error(
            422,
            "too_many_stitches",
            f"A chart of {chart_width}x{chart_height} stitches is too large for this image. "
            f"Use a grid width of {allowed} or less.",
            max_grid_width=allowed,
            max_stitches=settings.max_stitches,
        )

    try:
        return generate_cross_stitch(
            pixels,
            grid_width,
            n_colors,
            ignore_background=ignore_background,
            background_code=background_code,
        )
    except BackgroundNotInPalette as error:
        raise api_error(
            422,
            "background_not_in_palette",
            f"Thread {error.code} is not one of the chart's colors.",
            available=error.available,
        ) from None
    except NothingToStitch:
        raise api_error(
            422,
            "nothing_to_stitch",
            "After leaving the background unstitched there is nothing left to stitch. "
            "Try asking for more colors, for example 2 for a single-color drawing.",
        ) from None
