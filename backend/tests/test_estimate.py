import pytest

from app.services.estimate import (
    DEFAULT_FABRIC_COUNT,
    FABRIC_COUNTS,
    cell_size_cm,
    size_cm,
    skeins_needed,
)


def test_the_default_count_is_one_of_the_offered_counts():
    assert DEFAULT_FABRIC_COUNT in FABRIC_COUNTS


def test_a_stitch_on_14_count_is_about_1_8_mm():
    assert cell_size_cm(14) == pytest.approx(0.1814, abs=1e-4)


def test_higher_counts_make_smaller_stitches():
    sizes = [cell_size_cm(count) for count in FABRIC_COUNTS]
    assert sizes == sorted(sizes, reverse=True)


def test_size_in_centimeters_follows_the_count():
    width, height = size_cm(140, 70, 14)

    assert width == pytest.approx(25.4)
    assert height == pytest.approx(12.7)


def test_a_chart_is_smaller_on_finer_fabric():
    assert size_cm(100, 100, 18)[0] < size_cm(100, 100, 11)[0]


def test_fabric_count_must_be_positive():
    with pytest.raises(ValueError):
        cell_size_cm(0)


def test_no_stitches_need_no_thread():
    assert skeins_needed(0, 14) == 0


def test_any_used_color_needs_at_least_one_skein():
    assert skeins_needed(1, 14) == 1
    assert skeins_needed(50, 14) == 1


def test_a_skein_covers_around_two_thousand_stitches_on_14_count():
    assert skeins_needed(1_500, 14) == 1
    assert skeins_needed(2_500, 14) == 2
    assert skeins_needed(5_000, 14) == 3


def test_coarser_fabric_uses_more_thread_for_the_same_stitches():
    assert skeins_needed(3_000, 11) > skeins_needed(3_000, 22)


def test_more_strands_use_more_thread():
    assert skeins_needed(3_000, 14, strands=3) > skeins_needed(3_000, 14, strands=1)


def test_rejects_impossible_inputs():
    with pytest.raises(ValueError):
        skeins_needed(-1, 14)
    with pytest.raises(ValueError):
        skeins_needed(100, 14, strands=0)
    with pytest.raises(ValueError):
        skeins_needed(100, 14, strands=7)
