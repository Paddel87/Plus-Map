"""SQLAlchemy ORM models for Plus-Map.

Importing this package registers all mapped classes with the shared
``Base.metadata`` so Alembic autogenerate sees them.
"""

from __future__ import annotations

from app.models.application import Application, ApplicationEquipment
from app.models.base import Base
from app.models.catalog import (
    CatalogStatus,
    EquipmentCategory,
    EquipmentItem,
)
from app.models.event import Event, EventParticipant
from app.models.person import Person, PersonOrigin
from app.models.user import User, UserRole

__all__ = [
    "Application",
    "ApplicationEquipment",
    "Base",
    "CatalogStatus",
    "EquipmentCategory",
    "EquipmentItem",
    "Event",
    "EventParticipant",
    "Person",
    "PersonOrigin",
    "User",
    "UserRole",
]
