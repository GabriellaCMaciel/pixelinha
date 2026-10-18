from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.api.chart_input import build_chart
from app.core.config import Settings, get_settings
from app.schemas.cross_stitch import CrossStitchPreview

router = APIRouter(prefix="/cross-stitch", tags=["cross-stitch"])


@router.post("/preview", response_model=CrossStitchPreview)
def preview(
    image: UploadFile = File(..., description="PNG, JPEG or WEBP image."),
    grid_width: int | None = Form(None, description="Chart width in stitches."),
    n_colors: int | None = Form(None, description="Maximum number of thread colors."),
    ignore_background: bool = Form(
        False,
        description="Leave the background color (the most common on the border) unstitched.",
    ),
    background_code: str | None = Form(
        None,
        description="DMC code of a chart color to leave unstitched. Implies ignore_background.",
    ),
    settings: Settings = Depends(get_settings),
) -> CrossStitchPreview:
    """Turn an uploaded image into a cross-stitch chart with a DMC thread legend."""
    chart = build_chart(image, grid_width, n_colors, ignore_background, background_code, settings)
    return CrossStitchPreview.from_chart(chart)
