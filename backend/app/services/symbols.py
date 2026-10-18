"""Symbols used to tell thread colors apart on a printed chart."""

# Ordered so the first symbols are the most distinct from each other: bold
# geometric shapes come first, then simple signs, then letters. Letters that
# are easy to confuse with digits or with other letters (I, O, Q, S) are left out.
SYMBOLS: tuple[str, ...] = tuple(
    "●○■□▲△▼▽◆◇★☆✚✖✱✦♥♦♣♠"
    "+#@%&*=?~^<>$!"
    "ABCDEFGHJKLMNPRTUVWXYZ"
)


def assign_symbols(count: int) -> list[str]:
    """Return `count` distinct symbols, one for each color of a palette."""
    if count < 0:
        raise ValueError("Number of symbols cannot be negative.")
    if count > len(SYMBOLS):
        raise ValueError(
            f"Only {len(SYMBOLS)} distinct symbols are available, {count} requested."
        )
    return list(SYMBOLS[:count])
