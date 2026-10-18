"""Printable PDF of a cross-stitch chart.

Pages, in order:
  1. Cover: preview of the finished piece, sizes and totals.
  2. Legend: every thread with its symbol, code, stitches and skeins.
  3. The chart itself, cut into A4 pages of 40 x 60 stitches.

Blocks are multiples of ten so the bold guide lines, drawn every ten stitches
of the whole chart, always fall on a page edge or inside a page, never off by
one from page to page.
"""

import io
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from PIL import Image
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas

from app.modes.cross_stitch import CrossStitchChart
from app.services.estimate import (
    CM_PER_INCH,
    DEFAULT_FABRIC_COUNT,
    DEFAULT_STRANDS,
    size_cm,
    skeins_needed,
)

Style = Literal["color", "bw"]
STYLES: tuple[str, ...] = ("color", "bw")

DEFAULT_TITLE = "Meu gráfico de ponto cruz"
MAX_TITLE_LENGTH = 60

FONT_DIR = Path(__file__).resolve().parent.parent / "data" / "fonts"
FONT = "DejaVuSans"
FONT_BOLD = "DejaVuSans-Bold"

# Page geometry, in points.
PAGE_W, PAGE_H = A4
MARGIN = 12 * mm
CELL = 4 * mm
BLOCK_COLS = 40
BLOCK_ROWS = 60
GUTTER = 7 * mm  # room for the stitch numbers

# Colors (the Petal Dream palette, plus plum for text).
INK = (0.231, 0.094, 0.188)
SOFT = (0.42, 0.29, 0.37)
BLOSSOM = (0.906, 0.561, 0.686)
PEONY = (0.949, 0.757, 0.839)
CORAL = (0.957, 0.655, 0.486)
HONEY = (0.957, 0.835, 0.42)
LEAF = (0.776, 0.839, 0.478)
DAWN = (0.965, 0.945, 0.902)
THIN_LINE = (0.62, 0.58, 0.6)

LEGEND_ROW = 9 * mm
LEGEND_ROWS_PER_PAGE = 24

# The brand flower, one cross per letter (same drawing as the web app).
FLOWER = [
    "..pp.pp..",
    ".pPPpPPp.",
    "pPPPPPPPp",
    "pPPHHHPPp",
    ".PPHCHPP.",
    "pPPHHHPPp",
    "pPPPPPPPp",
    ".pPPpPPp.",
    "..pp.pp..",
    "....S....",
    ".LL.S.LL.",
    ".LLLSLLL.",
    "....S....",
]
FLOWER_THREADS = {
    "P": BLOSSOM,
    "p": CORAL,
    "H": HONEY,
    "C": (0.651, 0.251, 0.435),
    "S": (0.557, 0.651, 0.227),
    "L": LEAF,
}


@dataclass(frozen=True)
class Tile:
    """A rectangle of the chart printed on one page. Ends are exclusive."""

    col_start: int
    col_end: int
    row_start: int
    row_end: int


def page_tiles(width: int, height: int) -> list[Tile]:
    """Cut the chart into pages, left to right and then top to bottom."""
    tiles = []
    for row_start in range(0, height, BLOCK_ROWS):
        for col_start in range(0, width, BLOCK_COLS):
            tiles.append(
                Tile(
                    col_start,
                    min(col_start + BLOCK_COLS, width),
                    row_start,
                    min(row_start + BLOCK_ROWS, height),
                )
            )
    return tiles


def legend_page_count(n_colors: int) -> int:
    return max(1, math.ceil(n_colors / LEGEND_ROWS_PER_PAGE))


def _register_fonts() -> None:
    registered = pdfmetrics.getRegisteredFontNames()
    if FONT not in registered:
        pdfmetrics.registerFont(TTFont(FONT, str(FONT_DIR / "DejaVuSans.ttf")))
    if FONT_BOLD not in registered:
        pdfmetrics.registerFont(TTFont(FONT_BOLD, str(FONT_DIR / "DejaVuSans-Bold.ttf")))


def _number(value: int) -> str:
    return f"{value:,}".replace(",", ".")


def _decimal(value: float) -> str:
    return f"{value:.1f}".replace(".", ",")


def _fit(text: str, font: str, size: float, max_width: float) -> str:
    """Shorten text with an ellipsis so it fits in max_width points."""
    if pdfmetrics.stringWidth(text, font, size) <= max_width:
        return text
    while text and pdfmetrics.stringWidth(text + "…", font, size) > max_width:
        text = text[:-1]
    return text.rstrip() + "…"


def _tint(rgb: tuple[int, int, int], keep: float = 0.5) -> tuple[float, float, float]:
    """Thread color thinned toward white, so a black symbol stays readable."""
    return tuple((255 - (255 - channel) * keep) / 255 for channel in rgb)


def clean_title(title: str | None) -> str:
    title = " ".join((title or "").split())[:MAX_TITLE_LENGTH]
    return title or DEFAULT_TITLE


def _preview_png(chart: CrossStitchChart) -> bytes:
    """The finished piece as a crisp picture, one square per stitch."""
    palette = [tuple(color.rgb) for color in chart.colors]
    fabric = tuple(round(channel * 255) for channel in DAWN)
    image = Image.new("RGB", (chart.width, chart.height), fabric)
    pixels = image.load()
    for y in range(chart.height):
        row = chart.grid[y]
        for x in range(chart.width):
            index = int(row[x])
            if index >= 0:
                pixels[x, y] = palette[index]

    factor = max(1, math.ceil(800 / chart.width))
    image = image.resize((chart.width * factor, chart.height * factor), Image.NEAREST)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()


class _Document:
    def __init__(self, chart: CrossStitchChart, fabric_count: int, title: str, style: Style):
        _register_fonts()
        self.chart = chart
        self.fabric_count = fabric_count
        self.title = title
        self.style = style
        self.tiles = page_tiles(chart.width, chart.height)
        self.legend_pages = legend_page_count(len(chart.colors))
        self.total_pages = 1 + self.legend_pages + len(self.tiles)
        self.page = 0

        self.buffer = io.BytesIO()
        self.canvas = Canvas(self.buffer, pagesize=A4)
        self.canvas.setTitle(title)
        self.canvas.setAuthor("StitchLab")
        self.canvas.setCreator("StitchLab")
        self.canvas.setSubject("Gráfico de ponto cruz")

    # -- shared pieces ------------------------------------------------------

    def _start_page(self) -> None:
        self.page += 1

    def _finish_page(self, note: str = "") -> None:
        c = self.canvas
        c.setFillColorRGB(*SOFT)
        c.setFont(FONT, 7.5)
        c.drawString(MARGIN, 9 * mm, note or "Feito com o StitchLab")
        c.drawRightString(PAGE_W - MARGIN, 9 * mm, f"Página {self.page} de {self.total_pages}")
        c.showPage()

    def _header(self) -> None:
        c = self.canvas
        c.setFillColorRGB(*INK)
        c.setFont(FONT_BOLD, 11)
        c.drawString(MARGIN, PAGE_H - MARGIN - 4 * mm, _fit(self.title, FONT_BOLD, 11, 130 * mm))

    def _flower(self, x: float, y: float, cell: float) -> None:
        """Draw the brand flower with its lower-left corner at (x, y)."""
        c = self.canvas
        c.setLineCap(1)
        c.setLineWidth(cell * 0.26)
        rows = len(FLOWER)
        inset = cell * 0.2
        for r, row in enumerate(FLOWER):
            for q, key in enumerate(row):
                if key == ".":
                    continue
                c.setStrokeColorRGB(*FLOWER_THREADS[key])
                left = x + q * cell + inset
                right = x + (q + 1) * cell - inset
                top = y + (rows - r) * cell - inset
                bottom = y + (rows - r - 1) * cell + inset
                p = c.beginPath()
                p.moveTo(left, top)
                p.lineTo(right, bottom)
                p.moveTo(right, top)
                p.lineTo(left, bottom)
                c.drawPath(p, stroke=1, fill=0)

    def _running_stitch(self, y: float) -> None:
        c = self.canvas
        colors = [BLOSSOM, CORAL, HONEY, LEAF, PEONY]
        c.setLineCap(1)
        c.setLineWidth(2)
        x = MARGIN
        i = 0
        while x + 4 * mm <= PAGE_W - MARGIN:
            c.setStrokeColorRGB(*colors[i % len(colors)])
            c.line(x, y, x + 4 * mm, y)
            x += 6.5 * mm
            i += 1

    # -- cover --------------------------------------------------------------

    def cover(self) -> None:
        self._start_page()
        c = self.canvas
        chart = self.chart

        band_h = 42 * mm
        c.setFillColorRGB(*PEONY)
        c.rect(0, PAGE_H - band_h, PAGE_W, band_h, stroke=0, fill=1)
        self._flower(MARGIN, PAGE_H - band_h + 5 * mm, 2.4 * mm)

        text_x = MARGIN + 9 * 2.4 * mm + 8 * mm
        c.setFillColorRGB(*INK)
        c.setFont(FONT_BOLD, 21)
        c.drawString(text_x, PAGE_H - 21 * mm, _fit(self.title, FONT_BOLD, 21, PAGE_W - text_x - MARGIN))
        c.setFont(FONT, 10)
        c.setFillColorRGB(*SOFT)
        c.drawString(text_x, PAGE_H - 28 * mm, "Gráfico de ponto cruz com linhas DMC")
        self._running_stitch(PAGE_H - band_h - 5 * mm)

        # Preview, with the page numbers laid over it when the chart spans several pages.
        box_w = PAGE_W - 2 * MARGIN
        box_h = 118 * mm
        scale = min(box_w / chart.width, box_h / chart.height)
        draw_w, draw_h = chart.width * scale, chart.height * scale
        x0 = (PAGE_W - draw_w) / 2
        y_top = PAGE_H - band_h - 12 * mm
        y0 = y_top - draw_h

        c.drawImage(ImageReader(io.BytesIO(_preview_png(chart))), x0, y0, draw_w, draw_h)
        c.setStrokeColorRGB(*INK)
        c.setLineWidth(0.8)
        c.rect(x0, y0, draw_w, draw_h, stroke=1, fill=0)

        if len(self.tiles) > 1:
            first_chart_page = 1 + self.legend_pages + 1
            c.setStrokeColorRGB(*INK)
            c.setLineWidth(0.6)
            c.setDash(3, 2)
            for tile in self.tiles:
                left = x0 + tile.col_start * scale
                right = x0 + tile.col_end * scale
                top = y_top - tile.row_start * scale
                bottom = y_top - tile.row_end * scale
                c.rect(left, bottom, right - left, top - bottom, stroke=1, fill=0)
            c.setDash()
            for number, tile in enumerate(self.tiles):
                cx = x0 + (tile.col_start + tile.col_end) / 2 * scale
                cy = y_top - (tile.row_start + tile.row_end) / 2 * scale
                label = str(first_chart_page + number)
                radius = 4.2 * mm
                if (tile.col_end - tile.col_start) * scale < 2 * radius or (
                    tile.row_end - tile.row_start
                ) * scale < 2 * radius:
                    continue
                c.setFillColorRGB(1, 1, 1)
                c.setStrokeColorRGB(*INK)
                c.circle(cx, cy, radius, stroke=1, fill=1)
                c.setFillColorRGB(*INK)
                c.setFont(FONT_BOLD, 9)
                c.drawCentredString(cx, cy - 3.2, label)
            c.setFillColorRGB(*SOFT)
            c.setFont(FONT, 7.5)
            c.drawCentredString(
                PAGE_W / 2, y0 - 4.5 * mm, "Os números mostram em que página está cada parte do gráfico."
            )

        self._facts(y0 - 14 * mm)
        self._finish_page()

    def _facts(self, y: float) -> None:
        c = self.canvas
        chart = self.chart
        width_cm, height_cm = size_cm(chart.width, chart.height, self.fabric_count)
        margin_cm = 5
        facts = [
            ("Tamanho do gráfico", f"{chart.width} × {chart.height} pontos"),
            (
                f"Pronto em Aida {self.fabric_count}",
                f"{_decimal(width_cm)} × {_decimal(height_cm)} cm "
                f"({_decimal(width_cm / CM_PER_INCH)} × {_decimal(height_cm / CM_PER_INCH)} pol.)",
            ),
            (
                "Tecido sugerido",
                f"{_decimal(width_cm + 2 * margin_cm)} × {_decimal(height_cm + 2 * margin_cm)} cm "
                f"(sobra de {margin_cm} cm em cada lado)",
            ),
            ("Cores", str(len(chart.colors))),
            ("Pontos para bordar", _number(chart.total_stitches)),
        ]
        if chart.background is not None:
            facts.append(
                ("Fundo sem ponto", f"DMC {chart.background.code} ({chart.background.name})")
            )

        label_x = MARGIN
        value_x = MARGIN + 52 * mm
        for label, value in facts:
            c.setFont(FONT_BOLD, 9.5)
            c.setFillColorRGB(*INK)
            c.drawString(label_x, y, label)
            c.setFont(FONT, 9.5)
            c.drawString(value_x, y, _fit(value, FONT, 9.5, PAGE_W - MARGIN - value_x))
            y -= 6.2 * mm

        c.setFont(FONT, 7.5)
        c.setFillColorRGB(*SOFT)
        c.drawString(
            MARGIN,
            y - 2 * mm,
            f"Cruz inteira com {DEFAULT_STRANDS} fios. A quantidade de novelos é uma estimativa, com folga para as pontas.",
        )

    # -- legend -------------------------------------------------------------

    def legend(self) -> None:
        chart = self.chart
        colors = chart.colors
        per_page = LEGEND_ROWS_PER_PAGE

        for page_index in range(self.legend_pages):
            self._start_page()
            c = self.canvas
            self._header()
            c.setFillColorRGB(*INK)
            c.setFont(FONT_BOLD, 15)
            title = "Legenda de linhas" + (
                f" ({page_index + 1} de {self.legend_pages})" if self.legend_pages > 1 else ""
            )
            c.drawString(MARGIN, PAGE_H - MARGIN - 17 * mm, title)
            self._running_stitch(PAGE_H - MARGIN - 21 * mm)

            columns = {
                "symbol": MARGIN,
                "code": MARGIN + 17 * mm,
                "name": MARGIN + 42 * mm,
                "stitches": PAGE_W - MARGIN - 28 * mm,
                "skeins": PAGE_W - MARGIN,
            }
            y = PAGE_H - MARGIN - 31 * mm
            c.setFont(FONT_BOLD, 8.5)
            c.setFillColorRGB(*SOFT)
            c.drawString(columns["symbol"], y, "Símbolo")
            c.drawString(columns["code"], y, "DMC")
            c.drawString(columns["name"], y, "Nome")
            c.drawRightString(columns["stitches"], y, "Pontos")
            c.drawRightString(columns["skeins"], y, "Novelos")
            y -= 3 * mm

            chunk = colors[page_index * per_page : (page_index + 1) * per_page]
            for color in chunk:
                row_bottom = y - LEGEND_ROW
                swatch = 6.4 * mm
                sx = columns["symbol"]
                sy = row_bottom + (LEGEND_ROW - swatch) / 2
                if self.style == "color":
                    c.setFillColorRGB(*_tint(color.rgb))
                    c.setStrokeColorRGB(*INK)
                    c.setLineWidth(0.5)
                    c.rect(sx, sy, swatch, swatch, stroke=1, fill=1)
                else:
                    c.setStrokeColorRGB(*INK)
                    c.setLineWidth(0.5)
                    c.rect(sx, sy, swatch, swatch, stroke=1, fill=0)
                c.setFillColorRGB(*INK)
                c.setFont(FONT, 12)
                c.drawCentredString(sx + swatch / 2, sy + swatch / 2 - 4.2, color.symbol)

                baseline = row_bottom + LEGEND_ROW / 2 - 3.2
                c.setFont(FONT_BOLD, 10)
                c.drawString(columns["code"], baseline, color.code)
                c.setFont(FONT, 9.5)
                name_width = columns["stitches"] - 22 * mm - columns["name"]
                c.drawString(columns["name"], baseline, _fit(color.name, FONT, 9.5, name_width))
                c.drawRightString(columns["stitches"], baseline, _number(color.count))
                c.drawRightString(
                    columns["skeins"],
                    baseline,
                    str(skeins_needed(color.count, self.fabric_count)),
                )

                c.setStrokeColorRGB(*PEONY)
                c.setLineWidth(0.5)
                c.line(MARGIN, row_bottom, PAGE_W - MARGIN, row_bottom)
                y = row_bottom

            if page_index == self.legend_pages - 1:
                total_skeins = sum(skeins_needed(color.count, self.fabric_count) for color in colors)
                y -= 7 * mm
                c.setFillColorRGB(*INK)
                c.setFont(FONT_BOLD, 10)
                c.drawString(columns["code"], y, "Total")
                c.drawRightString(columns["stitches"], y, _number(chart.total_stitches))
                c.drawRightString(columns["skeins"], y, str(total_skeins))
            self._finish_page()

    # -- chart pages --------------------------------------------------------

    def chart_pages(self) -> None:
        for number, tile in enumerate(self.tiles, start=1):
            self._start_page()
            self._chart_page(number, tile)
            self._finish_page(
                f"Colunas {tile.col_start + 1} a {tile.col_end}  ·  "
                f"Linhas {tile.row_start + 1} a {tile.row_end}"
            )

    def _chart_page(self, number: int, tile: Tile) -> None:
        c = self.canvas
        chart = self.chart
        cols = tile.col_end - tile.col_start
        rows = tile.row_end - tile.row_start

        self._header()
        c.setFillColorRGB(*SOFT)
        c.setFont(FONT, 8)
        c.drawRightString(
            PAGE_W - MARGIN, PAGE_H - MARGIN - 4 * mm, f"Parte {number} de {len(self.tiles)}"
        )

        grid_w = BLOCK_COLS * CELL
        left = (PAGE_W - (grid_w + GUTTER)) / 2 + GUTTER
        top = PAGE_H - MARGIN - 12 * mm - GUTTER
        bottom = top - rows * CELL
        right = left + cols * CELL

        use_color = self.style == "color"
        symbol_size = CELL * 0.62
        c.setFont(FONT, symbol_size)

        for r in range(rows):
            row = chart.grid[tile.row_start + r]
            y = top - (r + 1) * CELL
            for q in range(cols):
                index = int(row[tile.col_start + q])
                if index < 0:
                    continue
                color = chart.colors[index]
                x = left + q * CELL
                if use_color:
                    c.setFillColorRGB(*_tint(color.rgb))
                    c.rect(x, y, CELL, CELL, stroke=0, fill=1)
                c.setFillColorRGB(*INK)
                c.drawCentredString(x + CELL / 2, y + CELL / 2 - symbol_size * 0.35, color.symbol)

        # Thin lines between stitches.
        c.setStrokeColorRGB(*THIN_LINE)
        c.setLineWidth(0.25)
        for q in range(cols + 1):
            c.line(left + q * CELL, bottom, left + q * CELL, top)
        for r in range(rows + 1):
            c.line(left, top - r * CELL, right, top - r * CELL)

        # Guide lines every ten stitches of the whole chart, and the page border.
        c.setStrokeColorRGB(*INK)
        c.setLineWidth(0.9)
        for q in range(cols + 1):
            if (tile.col_start + q) % 10 == 0 or q in (0, cols):
                c.line(left + q * CELL, bottom, left + q * CELL, top)
        for r in range(rows + 1):
            if (tile.row_start + r) % 10 == 0 or r in (0, rows):
                c.line(left, top - r * CELL, right, top - r * CELL)

        # Stitch numbers: every tenth column and row, plus the first of the page.
        c.setFillColorRGB(*INK)
        c.setFont(FONT, 7)
        for q in range(cols):
            absolute = tile.col_start + q + 1
            if absolute % 10 == 0 or q == 0:
                c.drawCentredString(left + q * CELL + CELL / 2, top + 2 * mm, str(absolute))
        for r in range(rows):
            absolute = tile.row_start + r + 1
            if absolute % 10 == 0 or r == 0:
                c.drawRightString(left - 1.6 * mm, top - r * CELL - CELL / 2 - 2.4, str(absolute))

        self._center_marks(tile, left, top, bottom, right)

    def _center_marks(self, tile: Tile, left: float, top: float, bottom: float, right: float) -> None:
        """Small triangles on the page edges that point at the middle of the chart."""
        c = self.canvas
        mid_col = self.chart.width // 2
        mid_row = self.chart.height // 2
        size = 1.6 * mm
        c.setFillColorRGB(*INK)

        if tile.col_start <= mid_col < tile.col_end:
            x = left + (mid_col - tile.col_start + 0.5) * CELL
            for y, sign in ((top + 5.2 * mm, -1), (bottom - 1.2 * mm, 1)):
                p = c.beginPath()
                p.moveTo(x - size / 2, y)
                p.lineTo(x + size / 2, y)
                p.lineTo(x, y + sign * size)
                p.close()
                c.drawPath(p, stroke=0, fill=1)
        if tile.row_start <= mid_row < tile.row_end:
            y = top - (mid_row - tile.row_start + 0.5) * CELL
            for x, sign in ((left - 6.2 * mm, 1), (right + 1.2 * mm, -1)):
                p = c.beginPath()
                p.moveTo(x, y - size / 2)
                p.lineTo(x, y + size / 2)
                p.lineTo(x + sign * size, y)
                p.close()
                c.drawPath(p, stroke=0, fill=1)

    def render(self) -> bytes:
        self.cover()
        self.legend()
        self.chart_pages()
        self.canvas.save()
        return self.buffer.getvalue()


def build_pdf(
    chart: CrossStitchChart,
    *,
    fabric_count: int = DEFAULT_FABRIC_COUNT,
    title: str | None = None,
    style: Style = "color",
) -> bytes:
    """Render the chart as a PDF and return its bytes."""
    if style not in STYLES:
        raise ValueError("Style must be 'color' or 'bw'.")
    return _Document(chart, fabric_count, clean_title(title), style).render()
