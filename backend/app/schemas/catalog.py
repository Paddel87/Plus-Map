"""Pydantic schemas for the EquipmentItem (outdoor-equipment) catalog."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.catalog import CatalogStatus, EquipmentCategory


class CatalogReject(BaseModel):
    """Request body for ``POST /equipment-items/{id}/reject`` (admin-only)."""

    reason: str = Field(min_length=1, max_length=2000)


class EquipmentItemCreate(BaseModel):
    category: EquipmentCategory
    brand: str | None = Field(default=None, max_length=120)
    model: str | None = Field(default=None, max_length=200)
    display_name: str = Field(min_length=1, max_length=300)
    note: str | None = None


class EquipmentItemUpdate(BaseModel):
    """Admin-only PATCH body for EquipmentItem.

    Identity fields (category, brand, model) are editable by admin to
    allow correction of typos / categorisation mistakes after approval
    (ADR-043 §B). UNIQUE conflicts return 409.
    """

    category: EquipmentCategory | None = None
    brand: str | None = Field(default=None, max_length=120)
    model: str | None = Field(default=None, max_length=200)
    display_name: str | None = Field(default=None, min_length=1, max_length=300)
    note: str | None = None


class EquipmentItemRead(BaseModel):
    id: uuid.UUID
    category: EquipmentCategory
    brand: str | None = None
    model: str | None = None
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
