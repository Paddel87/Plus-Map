"""Seed-script idempotency tests (Fahrplan: M1 DoD)."""

from __future__ import annotations

from app.models.base import uuid7
from app.seeds.restraint_types import INSERT_SQL as RESTRAINT_TYPE_SQL
from app.seeds.restraint_types import SEEDS as RESTRAINT_TYPE_SEEDS
from sqlalchemy import text
from sqlalchemy.engine import Engine


def _seed_once(db_engine: Engine) -> int:
    rt_stmt = text(RESTRAINT_TYPE_SQL.replace("gen_random_uuid()", ":id"))
    inserted = 0
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
            inserted += r.rowcount or 0
    return inserted


def test_seed_first_run_inserts_all(db_engine: Engine) -> None:
    with db_engine.begin() as conn:
        conn.execute(text('TRUNCATE "restraint_type" CASCADE'))
    inserted = _seed_once(db_engine)
    assert inserted == len(RESTRAINT_TYPE_SEEDS)


def test_seed_second_run_is_noop(db_engine: Engine) -> None:
    _seed_once(db_engine)
    inserted = _seed_once(db_engine)
    assert inserted == 0
