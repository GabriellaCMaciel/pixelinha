import os
from dataclasses import dataclass, fields
from functools import cache

ENV_PREFIX = "STITCHLAB_"


@dataclass(frozen=True)
class Settings:
    """Limits that keep the service responsive without getting in the user's way.

    Each value can be overridden with an environment variable named after the
    field, for example STITCHLAB_MAX_GRID_WIDTH=400.
    """

    max_upload_bytes: int = 10 * 1024 * 1024
    max_image_pixels: int = 40_000_000
    min_grid_width: int = 10
    max_grid_width: int = 300
    min_colors: int = 2
    max_colors: int = 40
    max_stitches: int = 90_000

    def __post_init__(self) -> None:
        for field in fields(self):
            if getattr(self, field.name) < 1:
                raise ValueError(f"{field.name} must be at least 1.")
        if self.min_grid_width > self.max_grid_width:
            raise ValueError("min_grid_width cannot be larger than max_grid_width.")
        if self.min_colors > self.max_colors:
            raise ValueError("min_colors cannot be larger than max_colors.")


def load_settings(environ: dict[str, str] | None = None) -> Settings:
    """Build the settings from defaults plus any STITCHLAB_* environment overrides."""
    environ = os.environ if environ is None else environ

    overrides: dict[str, int] = {}
    for field in fields(Settings):
        name = f"{ENV_PREFIX}{field.name.upper()}"
        raw = environ.get(name)
        if raw is None:
            continue
        try:
            overrides[field.name] = int(raw)
        except ValueError:
            raise ValueError(f"{name} must be a whole number, got {raw!r}.") from None

    return Settings(**overrides)


@cache
def get_settings() -> Settings:
    return load_settings()
