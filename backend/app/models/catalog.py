"""Catalog models with proposal workflow.

EquipmentItem carries the ``status`` and ``suggested_by`` /
``approved_by`` proposal flow described in fahrplan.md M7. Visibility
rules (admin sees all, editors see approved + own pending, viewers see
approved) are enforced via RLS policies set up in M2.
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


class EquipmentCategory(enum.StrEnum):
    """High-level grouping for the outdoor-equipment catalog."""

    NAVIGATION = "navigation"
    LIGHTING = "lighting"
    HYDRATION = "hydration"
    NUTRITION = "nutrition"
    SAFETY = "safety"
    TOOLS = "tools"
    DOCUMENTATION = "documentation"
    COMFORT = "comfort"
    MOBILITY = "mobility"
    CARRYING = "carrying"
    CLOTHING = "clothing"
    SHELTER = "shelter"
    OTHER = "other"


def _enum(enum_cls: type[enum.Enum], pg_name: str) -> Enum:
    """Postgres enum that stores the enum *value* (lowercase string)."""
    return Enum(
        enum_cls,
        name=pg_name,
        values_callable=lambda e: [m.value for m in e],
    )


# Shared Postgres enum: catalog_status is reused across multiple columns.
# Without inherit_schema=True / create_type=False elsewhere, SQLAlchemy
# would try to CREATE TYPE multiple times. Define once on the metadata
# and reference the same instance in every column.
_CATALOG_STATUS = Enum(
    CatalogStatus,
    name="catalog_status",
    values_callable=lambda e: [m.value for m in e],
    metadata=Base.metadata,
    create_constraint=True,
)


class EquipmentItem(Base, TimestampMixin):
    __tablename__ = "equipment_item"
    __table_args__ = (
        UniqueConstraint(
            "category",
            "brand",
            "model",
            name="uq_equipment_item_identity",
            postgresql_nulls_not_distinct=True,
        ),
        Index("ix_equipment_item_status", "status"),
        Index("ix_equipment_item_category", "category"),
        Index("ix_equipment_item_brand", "brand"),
    )

    id: Mapped[uuid.UUID] = pk_column()
    category: Mapped[EquipmentCategory] = mapped_column(
        _enum(EquipmentCategory, "equipment_category"),
        nullable=False,
    )
    brand: Mapped[str | None] = mapped_column(String(120), nullable=True)
    model: Mapped[str | None] = mapped_column(String(200), nullable=True)
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
