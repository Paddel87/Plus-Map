"""User model.

Inherits from ``SQLAlchemyBaseUserTableUUID`` so ``FastAPIUsers[User, …]``
type-checks correctly (ADR-025). All concrete columns are still declared
locally so the database schema stays unchanged: UUIDv7 default (ADR-018),
unique constraint via ``__table_args__`` (not via inline ``unique=True``),
and ``server_default`` on the boolean flags. The mandatory 1:1 link to
Person is enforced at the database level (NOT NULL UNIQUE) per ADR-010.
"""

from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING

from fastapi_users_db_sqlalchemy import SQLAlchemyBaseUserTableUUID
from sqlalchemy import Enum, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, pk_column


class UserRole(enum.StrEnum):
    """Application-level RBAC roles (architecture.md §RLS)."""

    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


class User(SQLAlchemyBaseUserTableUUID, Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "user"
    __table_args__ = (
        UniqueConstraint("email", name="uq_user_email"),
        UniqueConstraint("person_id", name="uq_user_person_id"),
        Index("ix_user_role", "role"),
    )

    # The fastapi-users base class declares id/email/hashed_password/is_active/
    # is_superuser/is_verified as Mapped[...] columns at runtime *and* as
    # plain types under TYPE_CHECKING. To preserve the protocol-friendly
    # type view while overriding the runtime column properties (UUIDv7
    # default per ADR-018, unique-via-__table_args__, server_default on
    # the booleans), we mirror that pattern here: at type-check time only
    # the parent's plain-type declarations are visible; at runtime our
    # mapped_column() overrides win.
    if not TYPE_CHECKING:
        id: Mapped[uuid.UUID] = pk_column()
        email: Mapped[str] = mapped_column(String(320), nullable=False)
        hashed_password: Mapped[str] = mapped_column(String(1024), nullable=False)
        is_active: Mapped[bool] = mapped_column(nullable=False, default=True, server_default="true")
        is_verified: Mapped[bool] = mapped_column(
            nullable=False, default=False, server_default="false"
        )
        is_superuser: Mapped[bool] = mapped_column(
            nullable=False, default=False, server_default="false"
        )

    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    person_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("person.id", ondelete="RESTRICT"),
        nullable=False,
    )
    display_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
