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


class CrossStitchPreview(BaseModel):
    """Chart returned to the front-end.

    `grid` has `height` rows of `width` numbers, each one the index of the
    stitch color in `colors`.
    """

    width: int
    height: int
    total_stitches: int
    colors: list[ChartColorOut]
    grid: list[list[int]]

    @classmethod
    def from_chart(cls, chart: CrossStitchChart) -> "CrossStitchPreview":
        return cls(
            width=chart.width,
            height=chart.height,
            total_stitches=chart.total_stitches,
            colors=[ChartColorOut(**asdict(color)) for color in chart.colors],
            grid=chart.grid.tolist(),
        )
