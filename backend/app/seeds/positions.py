"""Position lookup seeds (M1).

Source: ``architecture.md`` §Katalog-Seed (M1). All entries are seeded with
``status = 'approved'``.
"""

from __future__ import annotations

from collections.abc import Sequence

ARM_POSITIONS: Sequence[str] = (
    "hinter dem Rücken",
    "vor dem Körper",
    "über dem Kopf",
    "hinter dem Kopf",
    "seitlich",
    "gespreizt",
    "am Körper anliegend",
    "Strappado",
)

HAND_POSITIONS: Sequence[str] = (
    "Handgelenke",
    "Daumen",
    "Unterarme",
    "Handgelenk-an-Ellbogen",
)

HAND_ORIENTATIONS: Sequence[str] = (
    "Handrücken zueinander",
    "Handflächen zueinander",
    "parallel",
    "überkreuzt",
    "Daumen-zu-Daumen",
)


def insert_sql(table: str) -> str:
    return (
        f"INSERT INTO {table} (id, name, status) "
        "VALUES (:id, :name, 'approved') "
        f"ON CONFLICT ON CONSTRAINT uq_{table}_name DO NOTHING"
    )
