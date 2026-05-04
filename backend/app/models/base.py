"""SQLAlchemy declarative base, shared mixins, and column helpers.

UUIDv7 primary keys are generated client-side via ``uuid_utils.uuid7()``
(see ADR-018). Soft-delete fields live on User and Person (anonymisation
per ADR-002) and on Event and Application (RxDB tombstone replication
per ADR-030). Catalog rows and link tables remain hard-delete only.
"""

from __future__ import annotations

import uuid
from datetime import datetime

import uuid_utils
from sqlalchemy import DateTime, ForeignKey, MetaData, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# Naming convention keeps Alembic autogenerate diffs stable across machines.
NAMING_CONVENTION = {
    "ix": "ix_%(table_name)s_%(column_0_N_name)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Declarative base with deterministic constraint naming."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)


def uuid7() -> uuid.UUID:
    """Return a new UUIDv7 as a stdlib ``uuid.UUID``."""
    return uuid.UUID(str(uuid_utils.uuid7()))


def pk_column() -> Mapped[uuid.UUID]:
    """Standard UUIDv7 primary-key column."""
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid7)


class TimestampMixin:
    """``created_at`` (DEFAULT now()) and ``updated_at`` (set by trigger).

    The ``updated_at`` trigger is created in the initial Alembic migration
    (see ADR-018, decision C1).
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class CreatedByMixin:
    """``created_by`` FK to ``user.id`` for audit trails."""

    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="SET NULL"),
        nullable=True,
    )


class SoftDeleteMixin:
    """``is_deleted`` / ``deleted_at`` for tombstone-style deletion.

    Used by User and Person (anonymisation per ADR-002) and by Event and
    Application (RxDB tombstone replication per ADR-030). Catalog rows and
    link tables stay hard-delete.
    """

    is_deleted: Mapped[bool] = mapped_column(
        nullable=False,
        default=False,
        server_default="false",
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
