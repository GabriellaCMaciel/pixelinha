import json
from collections.abc import Sequence
from dataclasses import dataclass
from functools import cache
from pathlib import Path

import numpy as np

from app.services.color import rgb_to_lab
from app.services.quantization import Quantized

DMC_CATALOG_PATH = Path(__file__).resolve().parent.parent / "data" / "dmc.json"
DMC_NAMES_PT_PATH = Path(__file__).resolve().parent.parent / "data" / "dmc_names_pt.json"


@dataclass(frozen=True)
class DmcColor:
    code: str
    name: str
    hex: str
    rgb: tuple[int, int, int]
    name_pt: str = ""


@dataclass(frozen=True)
class MatchedPalette:
    """An image whose colors were matched to real threads.

    labels: (height, width) array with the palette index of every stitch.
    colors: the threads used, ordered from the lightest to the darkest.
    """

    labels: np.ndarray
    colors: list[DmcColor]


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


def load_catalog(path: Path, names_pt_path: Path | None = None) -> Catalog:
    """Read a catalog from a JSON file with a `colors` list of code, name, hex, rgb.

    `names_pt_path` is an optional JSON object that maps a thread code to its
    Portuguese name; threads without one keep an empty `name_pt`.
    """
    with open(path, encoding="utf-8") as file:
        data = json.load(file)
    names_pt: dict[str, str] = {}
    if names_pt_path is not None:
        with open(names_pt_path, encoding="utf-8") as file:
            names_pt = json.load(file)

    colors = [
        DmcColor(
            code=str(item["code"]),
            name=str(item["name"]),
            hex=str(item["hex"]),
            rgb=(int(item["rgb"][0]), int(item["rgb"][1]), int(item["rgb"][2])),
            name_pt=str(names_pt.get(str(item["code"]), "")),
        )
        for item in data["colors"]
    ]
    return Catalog(colors)


@cache
def load_dmc_catalog() -> Catalog:
    """Load the bundled DMC catalog once and reuse it."""
    return load_catalog(DMC_CATALOG_PATH, DMC_NAMES_PT_PATH)


def match_palette(quantized: Quantized, catalog: Catalog) -> MatchedPalette:
    """Match each color cluster to its nearest thread and merge clusters that share one.

    Two clusters can land on the same thread, and a thread must appear only once
    in the legend, so their stitches are merged under a single palette entry.
    """
    nearest = catalog.nearest(quantized.centers_lab)

    # Unique threads, lightest first, so the palette order is stable.
    used = np.unique(nearest)
    order = used[np.argsort(-catalog.lab[used, 0], kind="stable")]

    position = np.empty(len(catalog), dtype=np.int64)
    position[order] = np.arange(len(order))
    cluster_to_palette = position[nearest]

    return MatchedPalette(
        labels=cluster_to_palette[quantized.labels],
        colors=[catalog.colors[int(index)] for index in order],
    )
