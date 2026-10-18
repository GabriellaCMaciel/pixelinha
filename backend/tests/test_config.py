import pytest

from app.core.config import Settings, get_settings, load_settings


def test_defaults_are_generous_but_bounded():
    settings = Settings()

    assert settings.max_upload_bytes == 10 * 1024 * 1024
    assert settings.min_grid_width == 10
    assert settings.max_grid_width == 300
    assert settings.min_colors == 1
    assert settings.max_colors == 40
    assert settings.max_stitches == 90_000


def test_default_color_limit_fits_the_available_symbols():
    from app.services.symbols import SYMBOLS

    assert Settings().max_colors <= len(SYMBOLS)


def test_no_environment_gives_the_defaults():
    assert load_settings({}) == Settings()


def test_environment_overrides_a_single_limit():
    settings = load_settings({"STITCHLAB_MAX_GRID_WIDTH": "400"})

    assert settings.max_grid_width == 400
    assert settings.max_colors == 40


def test_unrelated_environment_variables_are_ignored():
    assert load_settings({"PATH": "/usr/bin", "OTHER": "1"}) == Settings()


def test_non_numeric_override_is_rejected_with_a_clear_message():
    with pytest.raises(ValueError, match="STITCHLAB_MAX_COLORS"):
        load_settings({"STITCHLAB_MAX_COLORS": "many"})


@pytest.mark.parametrize("value", ["0", "-5"])
def test_limits_must_be_positive(value):
    with pytest.raises(ValueError):
        load_settings({"STITCHLAB_MAX_STITCHES": value})


def test_minimum_cannot_exceed_maximum():
    with pytest.raises(ValueError):
        Settings(min_grid_width=50, max_grid_width=20)
    with pytest.raises(ValueError):
        Settings(min_colors=10, max_colors=5)


def test_get_settings_is_cached():
    assert get_settings() is get_settings()
