"""Plus-Code helpers (ADR-020 §F).

Plus codes are computed on demand for the event-detail endpoint. Codes
are not persisted - if the algorithm changes, no migration is needed.
"""

from __future__ import annotations

from decimal import Decimal

from openlocationcode import openlocationcode as olc


def encode(lat: Decimal, lon: Decimal, code_length: int = 11) -> str:
    """Return the Open Location Code for the given coordinates.

    The default ``code_length`` of 11 yields ~3.5x2.8 m precision, which
    matches the Plus-Code "+" notation used in Maps.
    """
    return str(olc.encode(float(lat), float(lon), code_length))
