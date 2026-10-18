import io

import numpy as np
import pytest
from pypdf import PdfReader
from reportlab.pdfbase import pdfmetrics

from app.modes.cross_stitch import generate_cross_stitch
from app.services.pdf import (
    BLOCK_COLS,
    BLOCK_ROWS,
    DEFAULT_TITLE,
    FONT,
    MAX_TITLE_LENGTH,
    _register_fonts,
    build_pdf,
    clean_title,
    legend_page_count,
    page_tiles,
)
from app.services.symbols import SYMBOLS


def striped_image(size: int = 90) -> np.ndarray:
    """Four vertical bands of clearly different colors."""
    pixels = np.zeros((size, size, 3), dtype=np.uint8)
    band = size // 4
    colors = [(220, 30, 40), (30, 140, 60), (30, 60, 200), (250, 220, 40)]
    for index, color in enumerate(colors):
        pixels[:, index * band : (index + 1) * band if index < 3 else size] = color
    return pixels


@pytest.fixture(scope="module")
def chart():
    return generate_cross_stitch(striped_image(), grid_width=90, n_colors=4)


def read(pdf_bytes: bytes) -> PdfReader:
    return PdfReader(io.BytesIO(pdf_bytes))


def test_tiles_cover_every_cell_exactly_once():
    width, height = 95, 130
    seen = np.zeros((height, width), dtype=int)

    for tile in page_tiles(width, height):
        seen[tile.row_start : tile.row_end, tile.col_start : tile.col_end] += 1

    assert (seen == 1).all()


def test_tiles_are_cut_in_blocks_of_ten_so_guides_line_up():
    assert BLOCK_COLS % 10 == 0
    assert BLOCK_ROWS % 10 == 0
    for tile in page_tiles(300, 300):
        assert tile.col_start % 10 == 0
        assert tile.row_start % 10 == 0


def test_a_small_chart_is_a_single_page():
    assert len(page_tiles(30, 30)) == 1


def test_tiles_run_left_to_right_then_top_to_bottom():
    tiles = page_tiles(90, 130)

    assert [(t.col_start, t.row_start) for t in tiles] == [
        (0, 0), (40, 0), (80, 0),
        (0, 60), (40, 60), (80, 60),
        (0, 120), (40, 120), (80, 120),
    ]


def test_the_legend_grows_a_page_every_so_many_colors():
    assert legend_page_count(1) == 1
    assert legend_page_count(24) == 1
    assert legend_page_count(25) == 2
    assert legend_page_count(40) == 2


def test_the_font_has_every_symbol_of_the_chart():
    _register_fonts()
    glyphs = pdfmetrics.getFont(FONT).face.charToGlyph

    missing = [symbol for symbol in SYMBOLS if ord(symbol) not in glyphs]
    assert missing == []


def test_builds_a_valid_pdf(chart):
    pdf = build_pdf(chart)

    assert pdf.startswith(b"%PDF")
    assert len(read(pdf).pages) > 1


def test_page_count_is_cover_plus_legend_plus_chart_pages(chart):
    pdf = read(build_pdf(chart))

    expected = 1 + legend_page_count(len(chart.colors)) + len(page_tiles(chart.width, chart.height))
    assert len(pdf.pages) == expected


def test_pages_are_a4(chart):
    for page in read(build_pdf(chart)).pages:
        assert float(page.mediabox.width) == pytest.approx(595.27, abs=0.1)
        assert float(page.mediabox.height) == pytest.approx(841.89, abs=0.1)


def test_the_cover_shows_title_sizes_and_totals(chart):
    text = read(build_pdf(chart, title="Minha flor", fabric_count=14)).pages[0].extract_text()

    assert "Minha flor" in text
    assert "90 × 90 pontos" in text
    assert "Aida 14" in text
    assert "16,3 × 16,3 cm" in text
    assert "Pontos para bordar" in text


def test_the_fabric_count_changes_the_printed_size(chart):
    text = read(build_pdf(chart, fabric_count=18)).pages[0].extract_text()

    assert "Aida 18" in text
    assert "12,7 × 12,7 cm" in text


def test_the_legend_lists_every_thread(chart):
    pdf = read(build_pdf(chart))
    legend = pdf.pages[1].extract_text()

    for color in chart.colors:
        assert color.code in legend
    assert "Legenda de linhas" in legend
    assert "Total" in legend


def test_every_page_says_where_it_is_in_the_set(chart):
    pdf = read(build_pdf(chart))
    total = len(pdf.pages)

    for number, page in enumerate(pdf.pages, start=1):
        assert f"Página {number} de {total}" in page.extract_text()


def test_chart_pages_name_the_columns_and_rows_they_show(chart):
    pdf = read(build_pdf(chart))
    first_chart_page = 1 + legend_page_count(len(chart.colors))

    text = pdf.pages[first_chart_page].extract_text()
    assert "Colunas 1 a 40" in text
    assert "Linhas 1 a 60" in text
    assert "Parte 1 de" in text


def test_the_symbols_are_printed_on_the_chart(chart):
    pdf = read(build_pdf(chart))
    first_chart_page = 1 + legend_page_count(len(chart.colors))

    text = "".join(page.extract_text() for page in pdf.pages[first_chart_page:])
    assert all(color.symbol in text for color in chart.colors)


def test_black_and_white_is_smaller_than_color(chart):
    assert len(build_pdf(chart, style="bw")) < len(build_pdf(chart, style="color"))


def test_an_unknown_style_is_refused(chart):
    with pytest.raises(ValueError):
        build_pdf(chart, style="neon")


def test_the_background_is_named_when_left_unstitched():
    pixels = striped_image()
    pixels[:, 60:] = (255, 255, 255)
    chart = generate_cross_stitch(pixels, 90, 4, ignore_background=True)

    text = read(build_pdf(chart)).pages[0].extract_text()

    assert "Fundo sem ponto" in text
    assert f"DMC {chart.background.code}" in text


def test_a_single_color_chart_still_makes_a_pdf():
    pixels = np.zeros((30, 30, 3), dtype=np.uint8)
    pixels[:] = (200, 30, 60)
    chart = generate_cross_stitch(pixels, 30, 1)

    assert len(read(build_pdf(chart)).pages) == 3


def test_the_title_is_cleaned_up():
    assert clean_title("  Minha   flor \n linda ") == "Minha flor linda"
    assert clean_title("") == DEFAULT_TITLE
    assert clean_title(None) == DEFAULT_TITLE
    assert clean_title("x" * 200) == "x" * MAX_TITLE_LENGTH


def test_the_pdf_carries_the_title_as_metadata(chart):
    metadata = read(build_pdf(chart, title="Minha flor")).metadata

    assert metadata.title == "Minha flor"
    assert metadata.author == "StitchLab"
