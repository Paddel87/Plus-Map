"""Seed-script idempotency tests (Fahrplan: M1 DoD)."""

from __future__ import annotations

from app.models.base import uuid7
from app.seeds.positions import (
    ARM_POSITIONS,
    HAND_ORIENTATIONS,
    HAND_POSITIONS,
    insert_sql,
)
from app.seeds.restraint_types import INSERT_SQL as RESTRAINT_TYPE_SQL
from app.seeds.restraint_types import SEEDS as RESTRAINT_TYPE_SEEDS
from sqlalchemy import text
from sqlalchemy.engine import Engine


def _seed_once(db_engine: Engine) -> dict[str, int]:
    rt_stmt = text(RESTRAINT_TYPE_SQL.replace("gen_random_uuid()", ":id"))
    counts = {
        "restraint_type": 0,
        "arm_position": 0,
        "hand_position": 0,
        "hand_orientation": 0,
    }
    with db_engine.begin() as conn:
        for s in RESTRAINT_TYPE_SEEDS:
            r = conn.execute(
                rt_stmt,
                {
                    "id": uuid7(),
                    "category": s.category,
                    "brand": s.brand,
                    "model": s.model,
                    "mechanical_type": s.mechanical_type,
                    "display_name": s.display_name,
                },
            )
            counts["restraint_type"] += r.rowcount or 0
        for table, names in (
            ("arm_position", ARM_POSITIONS),
            ("hand_position", HAND_POSITIONS),
            ("hand_orientation", HAND_ORIENTATIONS),
        ):
            stmt = text(insert_sql(table))
            for name in names:
                r = conn.execute(stmt, {"id": uuid7(), "name": name})
                counts[table] += r.rowcount or 0
    return counts


def test_seed_first_run_inserts_all(db_engine: Engine) -> None:
    with db_engine.begin() as conn:
        for table in (
            "arm_position",
            "hand_position",
            "hand_orientation",
            "restraint_type",
        ):
            conn.execute(text(f'TRUNCATE "{table}" CASCADE'))
    counts = _seed_once(db_engine)
    assert counts["restraint_type"] == len(RESTRAINT_TYPE_SEEDS)
    assert counts["arm_position"] == len(ARM_POSITIONS)
    assert counts["hand_position"] == len(HAND_POSITIONS)
    assert counts["hand_orientation"] == len(HAND_ORIENTATIONS)


def test_seed_second_run_is_noop(db_engine: Engine) -> None:
    _seed_once(db_engine)
    counts = _seed_once(db_engine)
    assert counts == {
        "restraint_type": 0,
        "arm_position": 0,
        "hand_position": 0,
        "hand_orientation": 0,
    }
