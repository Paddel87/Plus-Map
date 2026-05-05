"""Pydantic schemas for Application and ApplicationRestraint."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ApplicationBase(BaseModel):
    performer_id: uuid.UUID
    recipient_id: uuid.UUID
    started_at: datetime | None = None
    ended_at: datetime | None = None
    note: str | None = None


class ApplicationCreate(ApplicationBase):
    """Body for ``POST /api/events/{event_id}/applications``.

    ``sequence_no`` is assigned server-side (next free integer for the
    event). Restraint types can be supplied directly here; otherwise they
    are wired in via ``POST /api/applications/{id}/restraints``.
    """

    restraint_type_ids: list[uuid.UUID] = Field(default_factory=list)


class ApplicationLiveStart(BaseModel):
    """Body for ``POST /api/events/{event_id}/applications/start`` (ADR-024 §B).

    ``started_at`` is assigned server-side. ``performer_id`` defaults to
    the requesting user's ``person_id`` if omitted (Regel-002).
    ``recipient_id`` defaults to the same person (self-bondage) if
    omitted; the UI is expected to pass the chosen recipient explicitly.
    """

    performer_id: uuid.UUID | None = None
    recipient_id: uuid.UUID | None = None
    note: str | None = None
    restraint_type_ids: list[uuid.UUID] = Field(default_factory=list)


class ApplicationUpdate(BaseModel):
    performer_id: uuid.UUID | None = None
    recipient_id: uuid.UUID | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    note: str | None = None


class ApplicationRead(ApplicationBase):
    id: uuid.UUID
    event_id: uuid.UUID
    sequence_no: int
    created_at: datetime
    updated_at: datetime | None = None
    restraint_type_ids: list[uuid.UUID] = []

    model_config = ConfigDict(from_attributes=True)


class RestraintRef(BaseModel):
    restraint_type_id: uuid.UUID
