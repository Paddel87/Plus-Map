"""Async SQLAlchemy engine, session factory, and FastAPI dependency.

The engine is created lazily so tests can override the database URL via
the ``HCMAP_DATABASE_URL`` environment variable before first use. Sessions
are scoped per request; commit/rollback is the caller's responsibility
(no implicit commit on context exit).
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from functools import lru_cache

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings


@lru_cache(maxsize=1)
def get_engine() -> AsyncEngine:
    """Return the process-wide async engine, creating it on first call.

    asyncpg's per-connection prepared-statement cache plus our per-request
    ``SET LOCAL`` GUCs interact badly: a cached plan can resolve
    ``current_setting('app.current_user_id')`` against the role that
    prepared it, not the one running it. Disabling the cache costs a
    handful of microseconds per query and is the documented workaround
    (asyncpg #200, SQLAlchemy docs).
    """
    settings = get_settings()
    return create_async_engine(
        settings.database_url,
        pool_pre_ping=True,
        future=True,
        connect_args={"statement_cache_size": 0},
    )


@lru_cache(maxsize=1)
def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(
        bind=get_engine(),
        expire_on_commit=False,
        autoflush=False,
    )


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency yielding an ``AsyncSession``.

    The session is closed on context exit. Errors are NOT swallowed; the
    caller is expected to commit or rollback explicitly.
    """
    sm = get_sessionmaker()
    async with sm() as session:
        yield session


def reset_engine_cache() -> None:
    """Clear cached engine/sessionmaker (test helper)."""
    get_engine.cache_clear()
    get_sessionmaker.cache_clear()
