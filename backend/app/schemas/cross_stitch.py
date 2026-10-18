from dataclasses import asdict

from pydantic import BaseModel

from app.modes.cross_stitch import CrossStitchChart


class ChartColorOut(BaseModel):
    code: str
    name: str
    hex: str
    rgb: tuple[int, int, int]
    symbol: str
    count: int


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
    `total_stitches` counts only the stitched cells. When the background is
    ignored, `background` tells which thread it was and how many cells it covers.
    """

    width: int
    height: int
    total_stitches: int
    colors: list[ChartColorOut]
    grid: list[list[int]]
    background: ChartBackgroundOut | None = None

    @classmethod
    def from_chart(cls, chart: CrossStitchChart) -> "CrossStitchPreview":
        return cls(
            width=chart.width,
            height=chart.height,
            total_stitches=chart.total_stitches,
            colors=[ChartColorOut(**asdict(color)) for color in chart.colors],
            grid=chart.grid.tolist(),
            background=(
                ChartBackgroundOut(**asdict(chart.background))
                if chart.background is not None
                else None
            ),
        )
