"""Event and EventParticipant models.

An Event is a single geo-located occurrence with one or more Applications
inside it. Coordinates are stored as decimal lat/lon and as a PostGIS
``geography(Point, 4326)`` generated column for spatial queries.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from geoalchemy2 import Geography
from sqlalchemy import (
    CheckConstraint,
    Computed,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
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


class Event(Base, TimestampMixin, CreatedByMixin, SoftDeleteMixin):
    __tablename__ = "event"
    __table_args__ = (
        CheckConstraint("lat >= -90 AND lat <= 90", name="lat_range"),
        CheckConstraint("lon >= -180 AND lon <= 180", name="lon_range"),
        CheckConstraint(
            "time_precision IN ('year', 'month', 'day', 'hour', 'minute')",
            name="event_time_precision_check",
        ),
        Index("ix_event_started_at", "started_at"),
        Index("ix_event_ended_at", "ended_at"),
        Index("ix_event_created_by", "created_by"),
        Index("ix_event_geom", "geom", postgresql_using="gist"),
        Index(
            "ix_event_note_fts",
            func.to_tsvector("german", "note"),
            postgresql_using="gin",
        ),
        Index("ix_event_cursor", "updated_at", "id"),
    )

    id: Mapped[uuid.UUID] = pk_column()
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    lat: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    lon: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    geom: Mapped[object] = mapped_column(
        Geography(geometry_type="POINT", srid=4326),
        Computed("ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography", persisted=True),
        nullable=False,
    )
    legacy_external_ref: Mapped[str | None] = mapped_column(Text, nullable=True)
    reveal_participants: Mapped[bool] = mapped_column(
        nullable=False, default=False, server_default="false"
    )
    title: Mapped[str | None] = mapped_column(String(120), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # ADR-058: granularity marker for retrospective entries. Live-mode
    # always sets 'minute' (backend default); backfill-mode UI exposes
    # a switcher. Sort/filter logic stays on started_at; only display
    # is conditioned on time_precision.
    time_precision: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="minute",
        server_default="minute",
    )
    # ADR-030: updated_at is the RxDB pull cursor → NOT NULL with a server-side
    # default (clock_timestamp matches the set_updated_at trigger from M1).
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("clock_timestamp()"),
    )


class EventParticipant(Base, SoftDeleteMixin):
    """n:m link between events and persons.

    Surrogate ``id`` PK (M5c.1b, ADR-037 §A) keeps the row addressable
    by RxDB's single-string primary-key model; the original
    ``(event_id, person_id)`` invariant is preserved as a UNIQUE
    constraint. Auto-Participant rule (ADR-012) is still enforced in
    the service layer.

    Soft-delete columns (``is_deleted``, ``deleted_at``) and the
    ``updated_at`` cursor follow the same pattern as event/application
    (ADR-030, ADR-037 §B); the ``cascade_event_soft_delete()`` trigger
    sets ``is_deleted = true`` here when the parent event is
    soft-deleted (ADR-037 §C).
    """

    __tablename__ = "event_participant"
    __table_args__ = (
        UniqueConstraint(
            "event_id",
            "person_id",
            name="uq_event_participant_event_id_person_id",
        ),
        Index("ix_event_participant_person_id", "person_id"),
        Index("ix_event_participant_cursor", "updated_at", "id"),
    )

    id: Mapped[uuid.UUID] = pk_column()
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("event.id", ondelete="CASCADE"),
        nullable=False,
    )
    person_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("person.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    # ADR-037 §B: updated_at is the RxDB pull cursor for
    # /api/sync/event-participants. NOT NULL with a server-side
    # default so every INSERT yields a usable timestamp.
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("clock_timestamp()"),
    )
