"""Pydantic schemas for fastapi-users.

Splits read/create/update so PII like ``hashed_password`` never escapes
the database boundary.
"""

from __future__ import annotations

import uuid

from fastapi_users import schemas
from pydantic import ConfigDict, Field

from app.models.user import UserRole


class UserRead(schemas.BaseUser[uuid.UUID]):
    """Public projection of a user row.

    Includes the application-level role and Person link; never includes the
    password hash.
    """

    role: UserRole
    person_id: uuid.UUID
    display_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class UserCreate(schemas.BaseUserCreate):
    """Admin-side user creation payload.

    Self-registration is intentionally not exposed; the auth router only
    mounts ``/me``, ``/login``, ``/logout``, and ``/forgot-password``.
    """

    role: UserRole
    person_id: uuid.UUID
    display_name: str | None = None
    password: str = Field(min_length=12)


class UserUpdate(schemas.BaseUserUpdate):
    """Self-update or admin-update payload."""

    role: UserRole | None = None
    display_name: str | None = None
    password: str | None = Field(default=None, min_length=12)
