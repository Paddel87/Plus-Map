"""SQLAlchemy ORM models for HC-Map.

Importing this package registers all mapped classes with the shared
``Base.metadata`` so Alembic autogenerate sees them.
"""

from __future__ import annotations

from app.models.application import Application, ApplicationRestraint
from app.models.base import Base
from app.models.catalog import (
    ArmPosition,
    CatalogStatus,
    HandOrientation,
    HandPosition,
    RestraintCategory,
    RestraintMechanicalType,
    RestraintType,
)
from app.models.event import Event, EventParticipant
from app.models.person import Person, PersonOrigin
from app.models.user import User, UserRole

__all__ = [
    "Application",
    "ApplicationRestraint",
    "ArmPosition",
    "Base",
    "CatalogStatus",
    "Event",
    "EventParticipant",
    "HandOrientation",
    "HandPosition",
    "Person",
    "PersonOrigin",
    "RestraintCategory",
    "RestraintMechanicalType",
    "RestraintType",
    "User",
    "UserRole",
]
