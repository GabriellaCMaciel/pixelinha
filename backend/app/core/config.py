import os
from dataclasses import dataclass, fields
from functools import cache

ENV_PREFIX = "PIXELINHA_"


@dataclass(frozen=True)
class Settings:
    """Limits that keep the service responsive without getting in the user's way.

    Each value can be overridden with an environment variable named after the
    field, for example PIXELINHA_MAX_GRID_WIDTH=400.
    """

    max_upload_bytes: int = 10 * 1024 * 1024
    max_image_pixels: int = 40_000_000
    min_grid_width: int = 10
    max_grid_width: int = 300
    min_colors: int = 1
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
    """Build the settings from defaults plus any PIXELINHA_* environment overrides."""
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


DEFAULT_ALLOWED_ORIGINS = ("http://localhost:5173", "http://127.0.0.1:5173")


@dataclass(frozen=True)
class CorsSettings:
    """Which web pages may call the API from a browser."""

    origins: tuple[str, ...]
    origin_regex: str | None = None


def load_cors(environ: dict[str, str] | None = None) -> CorsSettings:
    """Read the allowed origins from the environment.

    PIXELINHA_ALLOWED_ORIGINS is a comma-separated list of sites, for example
    "https://pixelinha.vercel.app". PIXELINHA_ALLOWED_ORIGIN_REGEX can add a
    pattern, useful for the preview addresses Vercel makes for each branch.
    Without them only the local development server is allowed.
    """
    environ = os.environ if environ is None else environ

    raw = environ.get(f"{ENV_PREFIX}ALLOWED_ORIGINS", "")
    origins = tuple(item.strip().rstrip("/") for item in raw.split(",") if item.strip())
    regex = environ.get(f"{ENV_PREFIX}ALLOWED_ORIGIN_REGEX", "").strip() or None

    return CorsSettings(origins=origins or DEFAULT_ALLOWED_ORIGINS, origin_regex=regex)
