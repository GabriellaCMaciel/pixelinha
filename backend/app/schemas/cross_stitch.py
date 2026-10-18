from dataclasses import asdict

from pydantic import BaseModel

from app.modes.cross_stitch import CrossStitchChart
from app.services.estimate import DEFAULT_FABRIC_COUNT, size_cm, skeins_needed


class ChartColorOut(BaseModel):
    code: str
    name: str
    hex: str
    rgb: tuple[int, int, int]
    symbol: str
    count: int
    skeins: int


class FabricOut(BaseModel):
    """Aida fabric the chart was planned for, and the size it will have on it."""

    count: int
    width_cm: float
    height_cm: float


class ChartBackgroundOut(BaseModel):
    code: str
    name: str
    hex: str
    rgb: tuple[int, int, int]
    count: int


class CrossStitchPreview(BaseModel):
    """Chart returned to the front-end.

    `grid` has `height` rows of `width` numbers, each one the index of the
    stitch color in `colors`, or -1 for a cell left without a stitch.
    `total_stitches` counts only the stitched cells. `fabric` gives the finished
    size on the chosen Aida count and each color's `skeins` is an estimate. When the background is
    ignored, `background` tells which thread it was and how many cells it covers.
    """

    width: int
    height: int
    total_stitches: int
    fabric: FabricOut
    colors: list[ChartColorOut]
    grid: list[list[int]]
    background: ChartBackgroundOut | None = None

    @classmethod
    def from_chart(
        cls, chart: CrossStitchChart, fabric_count: int = DEFAULT_FABRIC_COUNT
    ) -> "CrossStitchPreview":
        width_cm, height_cm = size_cm(chart.width, chart.height, fabric_count)
        return cls(
            width=chart.width,
            height=chart.height,
            total_stitches=chart.total_stitches,
            fabric=FabricOut(
                count=fabric_count,
                width_cm=round(width_cm, 1),
                height_cm=round(height_cm, 1),
            ),
            colors=[
                ChartColorOut(
                    **asdict(color),
                    skeins=skeins_needed(color.count, fabric_count),
                )
                for color in chart.colors
            ],
            grid=chart.grid.tolist(),
            background=(
                ChartBackgroundOut(**asdict(chart.background))
                if chart.background is not None
                else None
            ),
        )
