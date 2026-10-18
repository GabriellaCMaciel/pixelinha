"""Fabric size and thread estimates.

These are planning figures, not promises. The thread estimate leans toward
buying a little too much, because running out of a color halfway through is
worse than having leftovers.
"""

import math

# Aida counts, in stitches per inch. 14 is the usual choice for beginners.
FABRIC_COUNTS: tuple[int, ...] = (11, 14, 16, 18, 20, 22)
DEFAULT_FABRIC_COUNT = 14

DEFAULT_STRANDS = 2
MIN_STRANDS = 1
MAX_STRANDS = 6

CM_PER_INCH = 2.54

# A DMC skein is 8 m long and holds 6 strands.
SKEIN_STRAND_LENGTH_CM = 800 * 6

# Thread used by one full cross, as a multiple of the cell side, for one strand:
# two diagonals in front (2 * sqrt(2) = 2.83) plus about two sides of travel
# on the back.
CROSS_LENGTH_IN_CELLS = 2 * math.sqrt(2) + 2

# Extra for the tails at each start and end, and for threads cut short.
WASTE_FACTOR = 1.5


def cell_size_cm(fabric_count: int) -> float:
    """Side of one stitch, in centimeters, on fabric with this count."""
    if fabric_count < 1:
        raise ValueError("Fabric count must be at least 1.")
    return CM_PER_INCH / fabric_count


def size_cm(width: int, height: int, fabric_count: int) -> tuple[float, float]:
    """Finished size (width, height) of the stitched area, in centimeters."""
    cell = cell_size_cm(fabric_count)
    return width * cell, height * cell


def skeins_needed(stitches: int, fabric_count: int, strands: int = DEFAULT_STRANDS) -> int:
    """Whole skeins of one color for this many full crosses.

    Any color that is used at all needs at least one skein.
    """
    if stitches < 0:
        raise ValueError("Number of stitches cannot be negative.")
    if not MIN_STRANDS <= strands <= MAX_STRANDS:
        raise ValueError(f"Strands must be between {MIN_STRANDS} and {MAX_STRANDS}.")
    if stitches == 0:
        return 0

    strand_length = (
        stitches * CROSS_LENGTH_IN_CELLS * cell_size_cm(fabric_count) * strands * WASTE_FACTOR
    )
    return max(1, math.ceil(strand_length / SKEIN_STRAND_LENGTH_CM))
