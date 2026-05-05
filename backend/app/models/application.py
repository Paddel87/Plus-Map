"""Application and ApplicationEquipment models.

An Application is a single restraint action inside an Event with a Performer
and Recipient. Multiple applications are sequenced via ``sequence_no``.
``performer_id != recipient_id`` is a business rule (not a DB constraint),
deliberately allowing self-bondage cases (architecture.md §Datenmodell).
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    PrimaryKeyConstraint,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import (
    Base,
    CreatedByMixin,
    SoftDeleteMixin,
    TimestampMixin,
    pk_column,
)


class Application(Base, TimestampMixin, CreatedByMixin, SoftDeleteMixin):
    __tablename__ = "application"
    __table_args__ = (
        UniqueConstraint("event_id", "sequence_no", name="uq_application_event_sequence"),
        Index("ix_application_event_id", "event_id"),
        Index("ix_application_performer_id", "performer_id"),
        Index("ix_application_recipient_id", "recipient_id"),
        Index("ix_application_event_id_sequence_no", "event_id", "sequence_no"),
        Index(
            "ix_application_note_fts",
            func.to_tsvector("german", "note"),
            postgresql_using="gin",
        ),
        Index("ix_application_cursor", "updated_at", "id"),
    )

    id: Mapped[uuid.UUID] = pk_column()
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("event.id", ondelete="CASCADE"),
        nullable=False,
    )
    performer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("person.id", ondelete="RESTRICT"),
        nullable=False,
    )
    recipient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("person.id", ondelete="RESTRICT"),
        nullable=False,
    )
    sequence_no: Mapped[int] = mapped_column(Integer, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # ADR-030: updated_at is the RxDB pull cursor → NOT NULL with a server-side
    # default (clock_timestamp matches the set_updated_at trigger from M1).
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("clock_timestamp()"),
    )


class ApplicationEquipment(Base):
    """n:m link between applications and equipment items."""

    __tablename__ = "application_equipment"
    __table_args__ = (
        PrimaryKeyConstraint(
            "application_id", "equipment_item_id", name="pk_application_equipment"
        ),
        Index("ix_application_equipment_equipment_item_id", "equipment_item_id"),
    )

    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("application.id", ondelete="CASCADE"),
        nullable=False,
    )
    equipment_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("equipment_item.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
