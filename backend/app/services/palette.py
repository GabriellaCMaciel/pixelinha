import json
from collections.abc import Sequence
from dataclasses import dataclass
from functools import cache
from pathlib import Path

import numpy as np

from app.services.color import rgb_to_lab

DMC_CATALOG_PATH = Path(__file__).resolve().parent.parent / "data" / "dmc.json"


@dataclass(frozen=True)
class DmcColor:
    code: str
    name: str
    hex: str
    rgb: tuple[int, int, int]


class Catalog:
    """A thread catalog with its colors ready for nearest-color lookups in Lab."""

    def __init__(self, colors: Sequence[DmcColor]):
        if len(colors) == 0:
            raise ValueError("A catalog needs at least one color.")

        self.colors: list[DmcColor] = list(colors)
        self.rgb = np.array([c.rgb for c in self.colors], dtype=np.uint8)
        self.lab = rgb_to_lab(self.rgb)

    def __len__(self) -> int:
        return len(self.colors)

    def nearest(self, lab: np.ndarray) -> np.ndarray:
        """Return, for each Lab color (K x 3), the index of the closest catalog color.

        Ties go to the entry that comes first in the catalog.
        """
        lab = np.asarray(lab, dtype=np.float32)
        if lab.ndim != 2 or lab.shape[1] != 3:
            raise ValueError("Expected an array of Lab colors with shape (n, 3).")

        differences = lab[:, None, :] - self.lab[None, :, :]
        distances = np.linalg.norm(differences, axis=2)
        return np.argmin(distances, axis=1)


def load_catalog(path: Path) -> Catalog:
    """Read a catalog from a JSON file with a `colors` list of code, name, hex, rgb."""
    with open(path, encoding="utf-8") as file:
        data = json.load(file)

    colors = [
        DmcColor(
            code=str(item["code"]),
            name=str(item["name"]),
            hex=str(item["hex"]),
            rgb=(int(item["rgb"][0]), int(item["rgb"][1]), int(item["rgb"][2])),
        )
        for item in data["colors"]
    ]
    return Catalog(colors)


@cache
def load_dmc_catalog() -> Catalog:
    """Load the bundled DMC catalog once and reuse it."""
    return load_catalog(DMC_CATALOG_PATH)
