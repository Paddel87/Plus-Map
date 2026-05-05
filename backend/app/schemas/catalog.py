"""Pydantic schemas for the RestraintType (equipment) catalog."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.catalog import (
    CatalogStatus,
    RestraintCategory,
    RestraintMechanicalType,
)


class CatalogReject(BaseModel):
    """Request body for ``POST /restraint-types/{id}/reject`` (admin-only)."""

    reason: str = Field(min_length=1, max_length=2000)


class RestraintTypeCreate(BaseModel):
    category: RestraintCategory
    brand: str | None = Field(default=None, max_length=120)
    model: str | None = Field(default=None, max_length=200)
    mechanical_type: RestraintMechanicalType | None = None
    display_name: str = Field(min_length=1, max_length=300)
    note: str | None = None


class RestraintTypeUpdate(BaseModel):
    """Admin-only PATCH body for RestraintType.

    Identity fields (category, brand, model, mechanical_type) are
    editable by admin to allow correction of typos / categorisation
    mistakes after approval (ADR-043 §B). UNIQUE conflicts return 409.
    """

    category: RestraintCategory | None = None
    brand: str | None = Field(default=None, max_length=120)
    model: str | None = Field(default=None, max_length=200)
    mechanical_type: RestraintMechanicalType | None = None
    display_name: str | None = Field(default=None, min_length=1, max_length=300)
    note: str | None = None


class RestraintTypeRead(BaseModel):
    id: uuid.UUID
    category: RestraintCategory
    brand: str | None = None
    model: str | None = None
    mechanical_type: RestraintMechanicalType | None = None
    display_name: str
    status: CatalogStatus
    suggested_by: uuid.UUID | None = None
    approved_by: uuid.UUID | None = None
    rejected_by: uuid.UUID | None = None
    rejected_at: datetime | None = None
    reject_reason: str | None = None
    note: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
