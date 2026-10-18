import re
import unicodedata

from fastapi import APIRouter, Depends, File, Form, Response, UploadFile

from app.api.chart_input import build_chart, check_fabric_count
from app.core.config import Settings, get_settings
from app.core.errors import api_error
from app.schemas.cross_stitch import CrossStitchPreview
from app.services.pdf import DEFAULT_TITLE, STYLES, build_pdf, clean_title

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
    fabric_count: int | None = Form(
        None, description="Aida count in stitches per inch. Only changes the size and the skeins."
    ),
    settings: Settings = Depends(get_settings),
) -> CrossStitchPreview:
    """Turn an uploaded image into a cross-stitch chart with a DMC thread legend."""
    fabric_count = check_fabric_count(fabric_count)
    chart = build_chart(image, grid_width, n_colors, ignore_background, background_code, settings)
    return CrossStitchPreview.from_chart(chart, fabric_count)


def _file_name(title: str) -> str:
    """A plain ASCII file name made from the title, safe for a download header."""
    ascii_title = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_title.lower()).strip("-")
    return f"{slug or 'grafico-ponto-cruz'}.pdf"


@router.post(
    "/pdf",
    response_class=Response,
    responses={200: {"content": {"application/pdf": {}}, "description": "The chart as a PDF."}},
)
def pdf(
    image: UploadFile = File(..., description="PNG, JPEG or WEBP image."),
    grid_width: int | None = Form(None, description="Chart width in stitches."),
    n_colors: int | None = Form(None, description="Maximum number of thread colors."),
    ignore_background: bool = Form(False, description="Leave the background unstitched."),
    background_code: str | None = Form(None, description="DMC code to leave unstitched."),
    fabric_count: int | None = Form(None, description="Aida count in stitches per inch."),
    title: str | None = Form(None, description=f"Title on the pages. Default: {DEFAULT_TITLE!r}."),
    style: str = Form("color", description="'color' for tinted cells or 'bw' for black and white."),
    settings: Settings = Depends(get_settings),
) -> Response:
    """Make the chart exactly as the preview would, and return it as a printable PDF."""
    fabric_count = check_fabric_count(fabric_count)
    if style not in STYLES:
        raise api_error(
            422,
            "invalid_style",
            f"Style must be one of {', '.join(STYLES)}.",
            allowed=list(STYLES),
        )

    chart = build_chart(image, grid_width, n_colors, ignore_background, background_code, settings)
    title = clean_title(title)
    content = build_pdf(chart, fabric_count=fabric_count, title=title, style=style)

    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{_file_name(title)}"'},
    )
