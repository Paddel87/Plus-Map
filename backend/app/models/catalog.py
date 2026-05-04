"""Catalog models with proposal workflow.

RestraintType, ArmPosition, HandPosition, HandOrientation share the
``status`` and ``suggested_by`` / ``approved_by`` proposal flow described
in fahrplan.md M7. Visibility rules (admin sees all, editors see approved
+ own pending, viewers see approved) are enforced via RLS policies set up
in M2.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, pk_column


class CatalogStatus(enum.StrEnum):
    """Workflow state shared by all catalog tables."""

    APPROVED = "approved"
    PENDING = "pending"
    REJECTED = "rejected"


class RestraintCategory(enum.StrEnum):
    """High-level grouping for the restraint catalog."""

    HANDCUFFS = "handcuffs"
    THUMBCUFFS = "thumbcuffs"
    LEGCUFFS = "legcuffs"
    CUFFS_LEATHER = "cuffs_leather"
    ROPE = "rope"
    TAPE = "tape"
    CABLE_TIE = "cable_tie"
    CLOTH = "cloth"
    STRAP = "strap"
    OTHER = "other"


class RestraintMechanicalType(enum.StrEnum):
    """Mechanical type for cuff-style restraints."""

    CHAIN = "chain"
    HINGED = "hinged"
    RIGID = "rigid"


def _enum(enum_cls: type[enum.Enum], pg_name: str) -> Enum:
    """Postgres enum that stores the enum *value* (lowercase string)."""
    return Enum(
        enum_cls,
        name=pg_name,
        values_callable=lambda e: [m.value for m in e],
    )


# Shared Postgres enum: catalog_status is reused across four tables. Without
# inherit_schema=True / create_type=False elsewhere, SQLAlchemy would try to
# CREATE TYPE multiple times. We define it once here on the metadata and
# reference the same instance in every column.
_CATALOG_STATUS = Enum(
    CatalogStatus,
    name="catalog_status",
    values_callable=lambda e: [m.value for m in e],
    metadata=Base.metadata,
    create_constraint=True,
)


class RestraintType(Base, TimestampMixin):
    __tablename__ = "restraint_type"
    __table_args__ = (
        UniqueConstraint(
            "category",
            "brand",
            "model",
            "mechanical_type",
            name="uq_restraint_type_identity",
            postgresql_nulls_not_distinct=True,
        ),
        Index("ix_restraint_type_status", "status"),
        Index("ix_restraint_type_category", "category"),
        Index("ix_restraint_type_brand", "brand"),
    )

    id: Mapped[uuid.UUID] = pk_column()
    category: Mapped[RestraintCategory] = mapped_column(
        _enum(RestraintCategory, "restraint_category"),
        nullable=False,
    )
    brand: Mapped[str | None] = mapped_column(String(120), nullable=True)
    model: Mapped[str | None] = mapped_column(String(200), nullable=True)
    mechanical_type: Mapped[RestraintMechanicalType | None] = mapped_column(
        _enum(RestraintMechanicalType, "restraint_mechanical_type"),
        nullable=True,
    )
    display_name: Mapped[str] = mapped_column(String(300), nullable=False)
    status: Mapped[CatalogStatus] = mapped_column(
        _CATALOG_STATUS,
        nullable=False,
        default=CatalogStatus.PENDING,
        server_default=CatalogStatus.PENDING.value,
    )
    suggested_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="SET NULL"),
        nullable=True,
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="SET NULL"),
        nullable=True,
    )
    rejected_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="SET NULL"),
        nullable=True,
    )
    rejected_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    reject_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)


class _LookupBase(TimestampMixin):
    """Shared columns for ArmPosition / HandPosition / HandOrientation."""

    id: Mapped[uuid.UUID] = pk_column()
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[CatalogStatus] = mapped_column(
        _CATALOG_STATUS,
        nullable=False,
        default=CatalogStatus.PENDING,
        server_default=CatalogStatus.PENDING.value,
    )
    suggested_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="SET NULL"),
        nullable=True,
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="SET NULL"),
        nullable=True,
    )
    rejected_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="SET NULL"),
        nullable=True,
    )
    rejected_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    reject_reason: Mapped[str | None] = mapped_column(Text, nullable=True)


class ArmPosition(Base, _LookupBase):
    __tablename__ = "arm_position"
    __table_args__ = (
        UniqueConstraint("name", name="uq_arm_position_name"),
        Index("ix_arm_position_status", "status"),
    )


class HandPosition(Base, _LookupBase):
    __tablename__ = "hand_position"
    __table_args__ = (
        UniqueConstraint("name", name="uq_hand_position_name"),
        Index("ix_hand_position_status", "status"),
    )


class HandOrientation(Base, _LookupBase):
    __tablename__ = "hand_orientation"
    __table_args__ = (
        UniqueConstraint("name", name="uq_hand_orientation_name"),
        Index("ix_hand_orientation_status", "status"),
    )
