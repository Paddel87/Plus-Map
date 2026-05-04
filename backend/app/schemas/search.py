"""Pydantic schemas for the full-text search and throwback endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class SearchHit(BaseModel):
    """One row in the full-text search response (ADR-020 §G)."""

    type: Literal["event", "application"]
    id: uuid.UUID
    event_id: uuid.UUID
    snippet: str


class ThrowbackEvent(BaseModel):
    id: uuid.UUID
    started_at: datetime
    note: str | None = None
    years_ago: int
