"""CLI entry point for catalog seeding.

Usage:
    uv run python -m app.seeds.run

Idempotent: re-running adds nothing if the catalog already contains the
seed entries (UNIQUE-constraint conflicts are ignored).
"""

from __future__ import annotations

import asyncio

from sqlalchemy import text

from app.db import get_engine
from app.models.base import uuid7
from app.seeds.positions import (
    ARM_POSITIONS,
    HAND_ORIENTATIONS,
    HAND_POSITIONS,
    insert_sql,
)
from app.seeds.restraint_types import INSERT_SQL as RESTRAINT_TYPE_SQL
from app.seeds.restraint_types import SEEDS as RESTRAINT_TYPE_SEEDS


async def seed_lookup(conn: object, table: str, names: tuple[str, ...]) -> int:
    """Seed one of the position lookup tables, return rows inserted."""
    stmt = text(insert_sql(table))
    inserted = 0
    for name in names:
        result = await conn.execute(stmt, {"id": uuid7(), "name": name})  # type: ignore[attr-defined]
        inserted += result.rowcount or 0
    return inserted


async def seed_restraint_types(conn: object) -> int:
    """Seed the restraint_type catalog with the M1 anchor models."""
    # Use an explicit id so we can keep UUIDv7 even though the SQL uses a
    # named parameter. We bind id per row.
    stmt = text(RESTRAINT_TYPE_SQL.replace("gen_random_uuid()", ":id"))
    inserted = 0
    for seed in RESTRAINT_TYPE_SEEDS:
        result = await conn.execute(  # type: ignore[attr-defined]
            stmt,
            {
                "id": uuid7(),
                "category": seed.category,
                "brand": seed.brand,
                "model": seed.model,
                "mechanical_type": seed.mechanical_type,
                "display_name": seed.display_name,
            },
        )
        inserted += result.rowcount or 0
    return inserted


async def main() -> None:
    engine = get_engine()
    async with engine.begin() as conn:
        rt = await seed_restraint_types(conn)
        ap = await seed_lookup(conn, "arm_position", tuple(ARM_POSITIONS))
        hp = await seed_lookup(conn, "hand_position", tuple(HAND_POSITIONS))
        ho = await seed_lookup(conn, "hand_orientation", tuple(HAND_ORIENTATIONS))
    await engine.dispose()
    print(
        f"Seeded: restraint_type={rt}, arm_position={ap}, hand_position={hp}, hand_orientation={ho}"
    )


if __name__ == "__main__":
    asyncio.run(main())
