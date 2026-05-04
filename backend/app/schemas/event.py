"""Pydantic schemas for Event and EventParticipant."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.person import PersonRead

# ADR-058: granularity marker for retrospective event entry.
TimePrecision = Literal["year", "month", "day", "hour", "minute"]


class EventBase(BaseModel):
    started_at: datetime
    ended_at: datetime | None = None
    lat: Decimal = Field(..., ge=Decimal("-90"), le=Decimal("90"))
    lon: Decimal = Field(..., ge=Decimal("-180"), le=Decimal("180"))
    reveal_participants: bool = False
    title: str | None = Field(default=None, max_length=120)
    note: str | None = None
    time_precision: TimePrecision = "minute"
    legacy_external_ref: str | None = None


class EventCreate(EventBase):
    """Body for ``POST /api/events`` (non-Live mode, see ADR-020 §A)."""


class EventStart(BaseModel):
    """Body for ``POST /api/events/start`` (Live-mode, see ADR-024 §B).

    ``started_at`` is assigned server-side as ``now()``. Optionally a
    recipient person can be passed in — the server then adds it as
    ``EventParticipant`` so the UI can pre-fill subsequent live-applications.
    """

    lat: Decimal = Field(..., ge=Decimal("-90"), le=Decimal("90"))
    lon: Decimal = Field(..., ge=Decimal("-180"), le=Decimal("180"))
    recipient_id: uuid.UUID | None = None
    reveal_participants: bool = False
    title: str | None = Field(default=None, max_length=120)
    note: str | None = None
    time_precision: TimePrecision = "minute"


class EventUpdate(BaseModel):
    started_at: datetime | None = None
    ended_at: datetime | None = None
    lat: Decimal | None = Field(default=None, ge=Decimal("-90"), le=Decimal("90"))
    lon: Decimal | None = Field(default=None, ge=Decimal("-180"), le=Decimal("180"))
    reveal_participants: bool | None = None
    title: str | None = Field(default=None, max_length=120)
    note: str | None = None
    time_precision: TimePrecision | None = None
    legacy_external_ref: str | None = None


class EventListItem(EventBase):
    """Compact list-view (no plus_code, no embedded children)."""

    id: uuid.UUID
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class EventDetail(EventListItem):
    """Detail-view with derived plus_code and embedded participants."""

    plus_code: str
    participants: list[PersonRead] = []


class EventParticipantRef(BaseModel):
    person_id: uuid.UUID
