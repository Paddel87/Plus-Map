"""Alembic environment supporting sync (psycopg) and async (asyncpg) DSNs.

The DSN comes from ``PLUSMAP_DATABASE_URL`` so dev/test/prod stay aligned
with the runtime app config. Async DSNs use ``async_engine_from_config``;
sync DSNs use the regular ``engine_from_config`` so callers (e.g. pytest
fixtures) can run migrations from inside a running event loop.
"""

from __future__ import annotations

import asyncio
from logging.config import fileConfig

from alembic import context
from app.config import get_settings
from app.models import Base
from sqlalchemy import engine_from_config, pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Use the DSN already set in the Alembic config (caller may have overridden
# it, e.g. test fixtures running migrations on a sync URL). Fall back to
# runtime settings only when the config still holds the placeholder default.
_placeholder = "postgresql+psycopg://plusmap:plusmap@db:5432/plusmap"
if config.get_main_option("sqlalchemy.url") in (None, _placeholder):
    settings = get_settings()
    config.set_main_option("sqlalchemy.url", settings.database_url)

target_metadata = Base.metadata


def _include_object(
    object_: object,
    name: str | None,
    type_: str,
    reflected: bool,
    compare_to: object | None,
) -> bool:
    """Skip PostGIS-managed tables/indexes from autogenerate diffs."""
    if type_ == "table" and name in {"spatial_ref_sys"}:
        return False
    return not (type_ == "index" and name and name.startswith("idx_"))


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=_include_object,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_object=_include_object,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online_async() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online_sync() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        do_run_migrations(connection)
    connectable.dispose()


def _is_async_url(url: str) -> bool:
    return "+asyncpg" in url or "+aiomysql" in url or "+aiosqlite" in url


if context.is_offline_mode():
    run_migrations_offline()
elif _is_async_url(config.get_main_option("sqlalchemy.url") or ""):
    asyncio.run(run_migrations_online_async())
else:
    run_migrations_online_sync()
