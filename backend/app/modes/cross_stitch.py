from dataclasses import dataclass

import numpy as np

from app.services.background import UNSTITCHED, detect_background_index, remove_background
from app.services.counting import count_stitches
from app.services.imaging import resize_to_grid
from app.services.palette import Catalog, load_dmc_catalog, match_palette
from app.services.quantization import quantize_colors
from app.services.symbols import assign_symbols


class NothingToStitch(ValueError):
    """Every cell is background, so the chart would have no stitches."""


class BackgroundNotInPalette(ValueError):
    """The requested background thread is not one of the chart's colors."""

    def __init__(self, code: str, available: list[str]):
        super().__init__(f"Thread {code!r} is not in the chart.")
        self.code = code
        self.available = available


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
class ChartBackground:
    """The thread color left unstitched, and how many cells it covers."""

    code: str
    name: str
    hex: str
    rgb: tuple[int, int, int]
    count: int


@dataclass(frozen=True)
class CrossStitchChart:
    """A finished cross-stitch chart.

    grid holds, for every cell, the index of its color in `colors`, or -1 for a
    cell left without a stitch (the background). Colors are ordered from the
    lightest to the darkest.
    """

    width: int
    height: int
    colors: list[ChartColor]
    grid: np.ndarray
    background: ChartBackground | None = None

    @property
    def total_stitches(self) -> int:
        """Number of stitches to embroider, not counting the unstitched background."""
        return sum(color.count for color in self.colors)


def generate_cross_stitch(
    image: np.ndarray,
    grid_width: int,
    n_colors: int,
    catalog: Catalog | None = None,
    ignore_background: bool = False,
    background_code: str | None = None,
) -> CrossStitchChart:
    """Turn an RGB image (H x W x 3, uint8) into a cross-stitch chart.

    Pipeline: resize to the grid, reduce to `n_colors` colors, match them to
    real threads (merging colors that share one), optionally leave the background
    unstitched, then give each thread a symbol and count its stitches.

    The background is either `background_code` (a thread code that must be one of
    the chart's colors) or, with `ignore_background`, the color most common on the
    border of the image. Asking for one extra color helps when the artwork itself
    has a single color: use 2 colors, one for the artwork and one for the background.
    """
    catalog = catalog if catalog is not None else load_dmc_catalog()

    grid_image = resize_to_grid(image, grid_width)
    quantized = quantize_colors(grid_image, n_colors)
    palette = match_palette(quantized, catalog)

    background = None
    if ignore_background or background_code is not None:
        if background_code is None:
            index = detect_background_index(palette.labels)
        else:
            codes = [thread.code for thread in palette.colors]
            if background_code not in codes:
                raise BackgroundNotInPalette(background_code, codes)
            index = codes.index(background_code)

        covered = int(np.count_nonzero(palette.labels == index))
        palette, removed = remove_background(palette, index)
        if not palette.colors:
            raise NothingToStitch("After removing the background no stitches are left.")
        background = ChartBackground(
            code=removed.code,
            name=removed.name,
            hex=removed.hex,
            rgb=removed.rgb,
            count=covered,
        )

    symbols = assign_symbols(len(palette.colors))
    counts = count_stitches(palette.labels[palette.labels != UNSTITCHED], len(palette.colors))

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
    return CrossStitchChart(
        width=width,
        height=height,
        colors=colors,
        grid=palette.labels,
        background=background,
    )
