"""Tests for the startup migration runner (M10.5, ADR-051 §F)."""

from __future__ import annotations

import os
from typing import Any
from unittest.mock import patch

import pytest
from app.config import Settings
from app.migrations_runner import (
    HCMAP_MIGRATION_LOCK_ID,
    _should_run,
    _to_async_dsn,
    _to_sync_dsn,
    run_migrations_with_advisory_lock,
)
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

# ---------------------------------------------------------------------------
# DSN helpers
# ---------------------------------------------------------------------------


def test_to_async_dsn_rewrites_psycopg() -> None:
    assert _to_async_dsn("postgresql+psycopg://u:p@h:5432/d") == "postgresql+asyncpg://u:p@h:5432/d"


def test_to_async_dsn_passes_through_when_already_async() -> None:
    url = "postgresql+asyncpg://u:p@h:5432/d"
    assert _to_async_dsn(url) == url


def test_to_async_dsn_rewrites_bare_postgresql() -> None:
    assert _to_async_dsn("postgresql://u:p@h:5432/d") == "postgresql+asyncpg://u:p@h:5432/d"


def test_to_sync_dsn_rewrites_asyncpg() -> None:
    assert _to_sync_dsn("postgresql+asyncpg://u:p@h:5432/d") == "postgresql+psycopg://u:p@h:5432/d"


def test_to_sync_dsn_passes_through_when_already_sync() -> None:
    url = "postgresql+psycopg://u:p@h:5432/d"
    assert _to_sync_dsn(url) == url


# ---------------------------------------------------------------------------
# _should_run gating
# ---------------------------------------------------------------------------


def _settings(env: str = "production") -> Settings:
    return Settings(
        environment=env,
        secret_key="test-secret-key-32-bytes-minimum-aaaaaaa",
    )


def test_should_run_true_in_production_default() -> None:
    with patch.dict(os.environ, {}, clear=False):
        os.environ.pop("HCMAP_SKIP_MIGRATIONS", None)
        assert _should_run(_settings("production")) is True


def test_should_run_false_when_skip_flag_set() -> None:
    with patch.dict(os.environ, {"HCMAP_SKIP_MIGRATIONS": "1"}):
        assert _should_run(_settings("production")) is False


def test_should_run_false_in_development() -> None:
    with patch.dict(os.environ, {}, clear=False):
        os.environ.pop("HCMAP_SKIP_MIGRATIONS", None)
        assert _should_run(_settings("development")) is False


def test_should_run_false_in_test_env() -> None:
    with patch.dict(os.environ, {}, clear=False):
        os.environ.pop("HCMAP_SKIP_MIGRATIONS", None)
        assert _should_run(_settings("test")) is False


# ---------------------------------------------------------------------------
# Lock id stays stable
# ---------------------------------------------------------------------------


def test_lock_id_is_signed_bigint_safe() -> None:
    """Postgres pg_advisory_lock takes a signed bigint (-2^63 .. 2^63-1)."""
    assert -(2**63) <= HCMAP_MIGRATION_LOCK_ID < 2**63


def test_lock_id_is_stable_constant() -> None:
    # Document the exact value so any accidental change shows up in diff.
    assert HCMAP_MIGRATION_LOCK_ID == 47_110_815


# ---------------------------------------------------------------------------
# Skip path is a no-op (no DB connection attempted)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_skip_returns_without_engine() -> None:
    """When _should_run returns False, no engine is built (no DSN required)."""
    settings = Settings(
        environment="development",
        secret_key="test-secret-key-32-bytes-minimum-aaaaaaa",
        # Garbage DSN — must not be touched.
        database_url="postgresql+asyncpg://nope:nope@nonexistent-host:1/nope",
    )
    with patch.dict(os.environ, {}, clear=False):
        os.environ.pop("HCMAP_SKIP_MIGRATIONS", None)
        # Should return cleanly without raising connection errors.
        await run_migrations_with_advisory_lock(settings)


@pytest.mark.asyncio
async def test_skip_flag_short_circuits_in_production() -> None:
    settings = Settings(
        environment="production",
        secret_key="test-secret-key-32-bytes-minimum-aaaaaaa",
        database_url="postgresql+asyncpg://nope:nope@nonexistent-host:1/nope",
    )
    with patch.dict(os.environ, {"HCMAP_SKIP_MIGRATIONS": "1"}):
        await run_migrations_with_advisory_lock(settings)


# ---------------------------------------------------------------------------
# Lock-and-upgrade integration test (real Postgres via conftest db_url)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_advisory_lock_round_trip_runs_alembic(
    async_db_url: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Production-mode invocation acquires the lock, runs alembic, releases.

    The schema is already migrated by the session-scoped ``db_engine``
    fixture; ``alembic upgrade head`` is therefore a no-op and the test
    asserts that the runner completes without raising and that the lock
    is released afterwards (i.e. a second `pg_try_advisory_lock` succeeds).
    """
    monkeypatch.setenv("HCMAP_DATABASE_URL", async_db_url)
    monkeypatch.delenv("HCMAP_SKIP_MIGRATIONS", raising=False)

    settings = Settings(
        environment="production",
        secret_key="test-secret-key-32-bytes-minimum-aaaaaaa",
        database_url=async_db_url,
    )

    await run_migrations_with_advisory_lock(settings)

    # Lock must be released — verify via a fresh session.
    engine = create_async_engine(async_db_url, poolclass=NullPool)
    try:
        async with engine.connect() as conn:
            got: Any = (
                await conn.execute(
                    text("SELECT pg_try_advisory_lock(:id)"),
                    {"id": HCMAP_MIGRATION_LOCK_ID},
                )
            ).scalar()
            assert got is True, "Migration lock leaked beyond runner"
            await conn.execute(
                text("SELECT pg_advisory_unlock(:id)"),
                {"id": HCMAP_MIGRATION_LOCK_ID},
            )
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_concurrent_runner_waits_then_skips(
    async_db_url: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """If the lock is already held, the runner waits and returns without
    running alembic a second time.

    The test grabs the advisory lock on a side connection, then runs the
    runner with a short delay before releasing. The runner must complete
    cleanly (it acquires the lock after release) and not raise.
    """
    import asyncio

    monkeypatch.setenv("HCMAP_DATABASE_URL", async_db_url)
    monkeypatch.delenv("HCMAP_SKIP_MIGRATIONS", raising=False)

    settings = Settings(
        environment="production",
        secret_key="test-secret-key-32-bytes-minimum-aaaaaaa",
        database_url=async_db_url,
    )

    # Hold the lock on a side connection, release after the runner has
    # had time to start waiting.
    holder_engine = create_async_engine(async_db_url, poolclass=NullPool)
    holder_conn = await holder_engine.connect()
    try:
        await holder_conn.execute(
            text("SELECT pg_advisory_lock(:id)"),
            {"id": HCMAP_MIGRATION_LOCK_ID},
        )

        async def release_after_delay() -> None:
            await asyncio.sleep(0.5)
            await holder_conn.execute(
                text("SELECT pg_advisory_unlock(:id)"),
                {"id": HCMAP_MIGRATION_LOCK_ID},
            )

        # Run the runner and the releaser concurrently. Runner blocks
        # on pg_advisory_lock until the holder releases, then returns.
        await asyncio.gather(
            run_migrations_with_advisory_lock(settings),
            release_after_delay(),
        )
    finally:
        await holder_conn.close()
        await holder_engine.dispose()
