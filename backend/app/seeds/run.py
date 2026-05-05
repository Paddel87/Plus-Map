"""CLI entry point for catalog seeding.

Usage:
    python -m app.seeds.run

Idempotent: re-running adds nothing if the catalog already contains the
seed entries (UNIQUE-constraint conflicts are ignored).
"""

from __future__ import annotations

import asyncio

from sqlalchemy import text

from app.db import get_engine
from app.models.base import uuid7
from app.seeds.equipment_items import INSERT_SQL as EQUIPMENT_ITEM_SQL
from app.seeds.equipment_items import SEEDS as EQUIPMENT_ITEM_SEEDS


async def seed_equipment_items(conn: object) -> int:
    """Seed the equipment_item catalog with the M1 anchor models."""
    # Use an explicit id so we can keep UUIDv7 even though the SQL uses a
    # named parameter. We bind id per row.
    stmt = text(EQUIPMENT_ITEM_SQL.replace("gen_random_uuid()", ":id"))
    inserted = 0
    for seed in EQUIPMENT_ITEM_SEEDS:
        result = await conn.execute(  # type: ignore[attr-defined]
            stmt,
            {
                "id": uuid7(),
                "category": seed.category,
                "brand": seed.brand,
                "model": seed.model,
                "display_name": seed.display_name,
            },
        )
        inserted += result.rowcount or 0
    return inserted


async def main() -> None:
    engine = get_engine()
    async with engine.begin() as conn:
        ei = await seed_equipment_items(conn)
    await engine.dispose()
    print(f"Seeded: equipment_item={ei}")


if __name__ == "__main__":
    asyncio.run(main())
