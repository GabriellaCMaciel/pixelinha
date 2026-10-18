import pytest

from app.services.symbols import SYMBOLS, assign_symbols


def test_there_are_enough_symbols_for_the_planned_color_limit():
    assert len(SYMBOLS) >= 40


def test_every_symbol_is_a_single_visible_character():
    for symbol in SYMBOLS:
        assert len(symbol) == 1
        assert not symbol.isspace()


def test_symbols_are_unique():
    assert len(set(SYMBOLS)) == len(SYMBOLS)


def test_confusable_letters_are_not_used():
    for letter in "IOQS":
        assert letter not in SYMBOLS


def test_assign_symbols_returns_distinct_symbols():
    result = assign_symbols(25)

    assert len(result) == 25
    assert len(set(result)) == 25


def test_assign_symbols_is_stable():
    assert assign_symbols(10) == assign_symbols(10)
    assert assign_symbols(10) == assign_symbols(30)[:10]


def test_assign_zero_symbols_returns_an_empty_list():
    assert assign_symbols(0) == []


def test_assign_all_available_symbols():
    assert assign_symbols(len(SYMBOLS)) == list(SYMBOLS)


def test_assign_more_symbols_than_available_fails():
    with pytest.raises(ValueError):
        assign_symbols(len(SYMBOLS) + 1)


def test_assign_negative_count_fails():
    with pytest.raises(ValueError):
        assign_symbols(-1)
