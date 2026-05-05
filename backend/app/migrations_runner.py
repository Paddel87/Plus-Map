"""Alembic auto-migration on backend startup (M10.5, ADR-051 §F).

In production the backend container runs ``alembic upgrade head`` once on
startup so a fresh ``docker compose up`` lands on the latest schema without
an extra step. Concurrency is bounded by a Postgres advisory lock so a
second backend instance (e.g. blue/green deploy) does not race against the
first; the runner-up simply waits for the lock to free, then continues
without a re-upgrade.

Default behaviour:

* ``PLUSMAP_ENVIRONMENT == 'production'`` — run migrations under the lock.
* anything else (development/test) — skip silently. Tests own their own
  schema lifecycle (``backend/tests/conftest.py``).
* ``PLUSMAP_SKIP_MIGRATIONS=1`` — operator override; skip in any environment.
"""

from __future__ import annotations

import asyncio
import os
import re
from pathlib import Path

import structlog
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.config import Settings

logger = structlog.get_logger(__name__)


# Stable advisory-lock id for Plus-Map alembic migrations across instances.
# Memorable, fits in a signed bigint, identifiable in pg_locks.
PLUSMAP_MIGRATION_LOCK_ID = 47_110_815


def _to_async_dsn(url: str) -> str:
    """Force an asyncpg driver — alembic.ini default is ``+psycopg``."""
    if "+asyncpg" in url:
        return url
    return re.sub(r"^postgresql(\+\w+)?://", "postgresql+asyncpg://", url, count=1)


def _to_sync_dsn(url: str) -> str:
    """Alembic's ``command.upgrade`` runs sync — flip asyncpg → psycopg."""
    if "+psycopg" in url:
        return url
    return re.sub(r"^postgresql(\+\w+)?://", "postgresql+psycopg://", url, count=1)


def _alembic_config(database_url: str) -> Config:
    """Build an Alembic config that uses the runtime DSN (sync)."""
    backend_dir = Path(__file__).resolve().parent.parent
    cfg = Config(str(backend_dir / "alembic.ini"))
    cfg.set_main_option("script_location", str(backend_dir / "migrations"))
    cfg.set_main_option("sqlalchemy.url", _to_sync_dsn(database_url))
    return cfg


def _run_alembic_upgrade_sync(database_url: str) -> None:
    """Synchronous ``alembic upgrade head`` — invoked via ``asyncio.to_thread``."""
    cfg = _alembic_config(database_url)
    command.upgrade(cfg, "head")


def _should_run(settings: Settings) -> bool:
    """Decide based on environment + override flag."""
    if os.environ.get("PLUSMAP_SKIP_MIGRATIONS", "").strip() == "1":
        logger.info("migrations.skipped", reason="PLUSMAP_SKIP_MIGRATIONS=1")
        return False
    if settings.environment != "production":
        logger.debug("migrations.skipped", reason=f"environment={settings.environment}")
        return False
    return True


async def run_migrations_with_advisory_lock(settings: Settings) -> None:
    """Run alembic migrations under a Postgres advisory lock.

    The lock is held by a single async connection for the entire upgrade.
    A second backend instance that arrives mid-upgrade will block on the
    lock, then release immediately when it acquires (migrations are now
    applied — no re-run needed).
    """
    if not _should_run(settings):
        return

    async_dsn = _to_async_dsn(settings.database_url)
    engine = create_async_engine(async_dsn, poolclass=NullPool)
    try:
        async with engine.connect() as conn:
            got_lock = (
                await conn.execute(
                    text("SELECT pg_try_advisory_lock(:id)"),
                    {"id": PLUSMAP_MIGRATION_LOCK_ID},
                )
            ).scalar()

            if got_lock:
                logger.info("migrations.lock_acquired", lock_id=PLUSMAP_MIGRATION_LOCK_ID)
                try:
                    await asyncio.to_thread(_run_alembic_upgrade_sync, settings.database_url)
                    logger.info("migrations.applied")
                finally:
                    await conn.execute(
                        text("SELECT pg_advisory_unlock(:id)"),
                        {"id": PLUSMAP_MIGRATION_LOCK_ID},
                    )
            else:
                logger.info(
                    "migrations.lock_busy",
                    lock_id=PLUSMAP_MIGRATION_LOCK_ID,
                    action="waiting_for_concurrent_migration",
                )
                await conn.execute(
                    text("SELECT pg_advisory_lock(:id)"),
                    {"id": PLUSMAP_MIGRATION_LOCK_ID},
                )
                await conn.execute(
                    text("SELECT pg_advisory_unlock(:id)"),
                    {"id": PLUSMAP_MIGRATION_LOCK_ID},
                )
                logger.info("migrations.skipped_concurrent")
    finally:
        await engine.dispose()
