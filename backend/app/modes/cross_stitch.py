from dataclasses import dataclass

import numpy as np

from app.services.counting import count_stitches
from app.services.imaging import resize_to_grid
from app.services.palette import Catalog, load_dmc_catalog, match_palette
from app.services.quantization import quantize_colors
from app.services.symbols import assign_symbols


@dataclass(frozen=True)
class ChartColor:
    """One thread of the chart legend."""

    code: str
    name: str
    hex: str
    rgb: tuple[int, int, int]
    symbol: str
    count: int


@dataclass(frozen=True)
class CrossStitchChart:
    """A finished cross-stitch chart.

    grid holds, for every stitch, the index of its color in `colors`.
    Colors are ordered from the lightest to the darkest.
    """

    width: int
    height: int
    colors: list[ChartColor]
    grid: np.ndarray

    @property
    def total_stitches(self) -> int:
        return self.width * self.height


def generate_cross_stitch(
    image: np.ndarray,
    grid_width: int,
    n_colors: int,
    catalog: Catalog | None = None,
) -> CrossStitchChart:
    """Turn an RGB image (H x W x 3, uint8) into a cross-stitch chart.

    Pipeline: resize to the grid, reduce to `n_colors` colors, match them to
    real threads (merging colors that share one), then give each thread a symbol
    and count its stitches.
    """
    catalog = catalog if catalog is not None else load_dmc_catalog()

    grid_image = resize_to_grid(image, grid_width)
    quantized = quantize_colors(grid_image, n_colors)
    palette = match_palette(quantized, catalog)

    symbols = assign_symbols(len(palette.colors))
    counts = count_stitches(palette.labels, len(palette.colors))

    colors = [
        ChartColor(
            code=thread.code,
            name=thread.name,
            hex=thread.hex,
            rgb=thread.rgb,
            symbol=symbol,
            count=count,
        )
        for thread, symbol, count in zip(palette.colors, symbols, counts)
    ]

    height, width = palette.labels.shape
    return CrossStitchChart(width=width, height=height, colors=colors, grid=palette.labels)
