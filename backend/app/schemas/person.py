"""Pydantic schemas for Person."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.person import PersonOrigin


class PersonRead(BaseModel):
    id: uuid.UUID
    name: str
    alias: str | None = None
    note: str | None = None
    origin: PersonOrigin
    linkable: bool
    is_deleted: bool
    deleted_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PersonCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    alias: str | None = Field(default=None, max_length=200)
    note: str | None = None
    linkable: bool = False


class PersonQuickCreate(BaseModel):
    """Body for ``POST /api/persons/quick`` (Live-mode, ADR-014 + ADR-024).

    Restricted to ``name`` and optional ``alias``. The server forces
    ``origin = on_the_fly`` and ``linkable = false`` (Regel-004).
    """

    name: str = Field(min_length=1, max_length=200)
    alias: str | None = Field(default=None, max_length=200)


class PersonUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    alias: str | None = Field(default=None, max_length=200)
    note: str | None = None
    linkable: bool | None = None
