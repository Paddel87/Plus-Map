"""Shared pytest fixtures.

DB tests use a sync engine (psycopg) for schema/RLS work and an async
engine (asyncpg) for HTTP-level auth tests. Both engines share the same
database. DSN resolution:
1. ``HCMAP_TEST_DATABASE_URL`` (preferred for CI / dev with local Postgres).
2. testcontainers ``postgis/postgis:16-3.4`` (skipped if Docker missing).
"""

from __future__ import annotations

import os

# These env vars must be present BEFORE the app modules are imported, because
# fastapi-users' CookieTransport reads ``cookie_secure`` at module init time
# (via ``app/auth/backend.py``). The runtime defaults are production-safe.
os.environ.setdefault("HCMAP_COOKIE_SECURE", "false")
os.environ.setdefault("HCMAP_SECRET_KEY", "test-secret-key-32-bytes-minimum-aaaaaaa")
os.environ.setdefault("HCMAP_ARGON2_TIME_COST", "1")
os.environ.setdefault("HCMAP_ARGON2_MEMORY_COST", "1024")

from collections.abc import AsyncIterator, Iterator

import pytest
from app.main import create_app
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import Session, sessionmaker

# ---------------------------------------------------------------------------
# Database fixtures (sync; M1 schema tests don't need async)
# ---------------------------------------------------------------------------


def _to_sync_url(url: str) -> str:
    return url.replace("+asyncpg", "+psycopg") if "+asyncpg" in url else url


def _to_async_url(url: str) -> str:
    return url.replace("+psycopg", "+asyncpg") if "+psycopg" in url else url


@pytest.fixture(scope="session")
def db_url() -> Iterator[str]:
    env_dsn = os.environ.get("HCMAP_TEST_DATABASE_URL")
    if env_dsn:
        yield _to_sync_url(env_dsn)
        return

    try:
        from testcontainers.postgres import PostgresContainer
    except ImportError:
        pytest.skip("HCMAP_TEST_DATABASE_URL not set and testcontainers not installed")
        return
    if not os.path.exists("/var/run/docker.sock"):
        pytest.skip("HCMAP_TEST_DATABASE_URL not set and Docker daemon is unreachable")
        return
    with PostgresContainer("postgis/postgis:16-3.4") as pg:
        sync_url = pg.get_connection_url()  # postgresql+psycopg2://...
        if "+psycopg2" in sync_url:
            sync_url = sync_url.replace("+psycopg2", "+psycopg")
        yield sync_url


@pytest.fixture(scope="session")
def db_engine(db_url: str) -> Iterator[Engine]:
    """Session-scoped sync engine. Migrates from scratch once per session."""
    from alembic import command
    from alembic.config import Config

    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", db_url)
    command.upgrade(cfg, "head")

    engine = create_engine(db_url, future=True)
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture
def db_session(db_engine: Engine) -> Iterator[Session]:
    """Function-scoped session in a rolled-back transaction."""
    SessionLocal = sessionmaker(bind=db_engine, expire_on_commit=False, autoflush=False)
    conn = db_engine.connect()
    trans = conn.begin()
    sess = SessionLocal(bind=conn)
    try:
        yield sess
    finally:
        sess.close()
        if trans.is_active:
            trans.rollback()
        conn.close()


# ---------------------------------------------------------------------------
# HTTP / Auth fixtures (async)
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def async_db_url(db_url: str, db_engine: Engine) -> str:
    """Depend on ``db_engine`` so the schema is migrated before any async
    test runs the first connection."""
    _ = db_engine  # keep dependency; engine itself isn't used here
    return _to_async_url(db_url)


@pytest.fixture
async def app_with_test_db(async_db_url: str, monkeypatch: pytest.MonkeyPatch):
    """Build a fresh FastAPI app whose ``get_session`` is bound to the test DB.

    Argon2/cookie ENV is already set at module top so import-time consumers
    pick it up. Database URL is set per test so different DSNs work in CI.
    """
    monkeypatch.setenv("HCMAP_DATABASE_URL", async_db_url)

    from app.db import reset_engine_cache

    reset_engine_cache()
    return create_app()


@pytest.fixture
async def client(app_with_test_db) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app_with_test_db)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def async_engine(async_db_url: str):
    eng = create_async_engine(async_db_url, future=True)
    try:
        yield eng
    finally:
        await eng.dispose()


@pytest.fixture
async def async_session_factory(async_engine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(bind=async_engine, expire_on_commit=False)
