"""Shared envelopes and helpers for HTTP responses."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class Page[T](BaseModel):
    """Generic paginated response envelope (offset/limit, ADR-020 §C)."""

    items: list[T]
    total: int = Field(..., ge=0)
    limit: int = Field(..., ge=1, le=200)
    offset: int = Field(..., ge=0)

    model_config = ConfigDict(arbitrary_types_allowed=True)
