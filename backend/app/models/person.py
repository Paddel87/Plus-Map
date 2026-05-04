"""Person model.

Persons exist independently of Users (only some persons have a User
account). On-the-fly persons created from the live capture flow carry
``origin = on_the_fly`` (see ADR-014). Anonymisation is in-place per
ADR-002: name replaced, FKs preserved.
"""

from __future__ import annotations

import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import (
    Base,
    CreatedByMixin,
    SoftDeleteMixin,
    TimestampMixin,
    pk_column,
)


class PersonOrigin(enum.StrEnum):
    """How the person record came into existence."""

    MANAGED = "managed"
    ON_THE_FLY = "on_the_fly"


class Person(Base, TimestampMixin, CreatedByMixin, SoftDeleteMixin):
    __tablename__ = "person"
    __table_args__ = (
        Index("ix_person_name", "name"),
        Index("ix_person_origin", "origin"),
        Index("ix_person_linkable", "linkable"),
        Index("ix_person_is_deleted", "is_deleted"),
    )

    id: Mapped[uuid.UUID] = pk_column()
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    alias: Mapped[str | None] = mapped_column(String(200), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    origin: Mapped[PersonOrigin] = mapped_column(
        Enum(PersonOrigin, name="person_origin", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=PersonOrigin.MANAGED,
        server_default=PersonOrigin.MANAGED.value,
    )
    linkable: Mapped[bool] = mapped_column(nullable=False, default=False, server_default="false")

    # Override CreatedByMixin to allow person creation before any user exists
    # (admin-bootstrap, manual backfill). FK is still enforced when set.
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "user.id", ondelete="SET NULL", use_alter=True, name="fk_person_created_by_user"
        ),
        nullable=True,
    )
