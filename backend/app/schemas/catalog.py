"""Pydantic schemas for the four catalog tables."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.catalog import (
    CatalogStatus,
    RestraintCategory,
    RestraintMechanicalType,
)


class _CatalogBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None


class _CatalogRead(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None = None
    status: CatalogStatus
    suggested_by: uuid.UUID | None = None
    approved_by: uuid.UUID | None = None
    rejected_by: uuid.UUID | None = None
    rejected_at: datetime | None = None
    reject_reason: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class _LookupUpdate(BaseModel):
    """Admin-only PATCH body for the simple lookup tables.

    All fields optional; ``status`` is intentionally absent so transitions
    only happen via the dedicated ``approve`` / ``reject`` endpoints
    (ADR-043 §B).
    """

    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = None


# --- Lookup tables -----------------------------------------------------


class ArmPositionCreate(_CatalogBase):
    pass


class ArmPositionRead(_CatalogRead):
    pass


class ArmPositionUpdate(_LookupUpdate):
    pass


class HandPositionCreate(_CatalogBase):
    pass


class HandPositionRead(_CatalogRead):
    pass


class HandPositionUpdate(_LookupUpdate):
    pass


class HandOrientationCreate(_CatalogBase):
    pass


class HandOrientationRead(_CatalogRead):
    pass


class HandOrientationUpdate(_LookupUpdate):
    pass


class CatalogReject(BaseModel):
    """Request body for ``POST /<catalog>/{id}/reject`` (admin-only)."""

    reason: str = Field(min_length=1, max_length=2000)


# --- RestraintType -----------------------------------------------------


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
