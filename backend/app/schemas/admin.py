"""Pydantic schemas for the /api/admin/* surface (M8.3, ADR-049)."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.models.user import UserRole
from app.schemas.person import PersonCreate


class AdminUserRead(BaseModel):
    id: uuid.UUID
    email: EmailStr
    role: UserRole
    is_active: bool
    is_verified: bool
    person_id: uuid.UUID
    display_name: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminUserCreate(BaseModel):
    """Admin-side user creation: link to an existing person OR create one."""

    email: EmailStr
    password: str = Field(min_length=12)
    role: UserRole
    display_name: str | None = Field(default=None, max_length=200)
    existing_person_id: uuid.UUID | None = None
    new_person: PersonCreate | None = None
    is_verified: bool = True

    @model_validator(mode="after")
    def _exactly_one_person_source(self) -> AdminUserCreate:
        provided = sum(1 for v in (self.existing_person_id, self.new_person) if v)
        if provided != 1:
            raise ValueError("Provide exactly one of `existing_person_id` or `new_person`.")
        return self


class AdminUserUpdate(BaseModel):
    role: UserRole | None = None
    is_active: bool | None = None
    display_name: str | None = Field(default=None, max_length=200)


class PersonMergeRequest(BaseModel):
    target_id: uuid.UUID = Field(
        description="The Person row to keep; ``source`` is the path-parameter id."
    )


class PersonMergeResponse(BaseModel):
    source_id: uuid.UUID
    target_id: uuid.UUID
    affected_event_participants: int
    deleted_event_participants: int
    affected_applications_performer: int
    affected_applications_recipient: int


class MonthlyEventCount(BaseModel):
    year: int
    month: int
    count: int


class RestraintCount(BaseModel):
    id: uuid.UUID
    display_name: str
    count: int


class AdminStats(BaseModel):
    events_total: int
    events_per_month_last_12: list[MonthlyEventCount]
    top_restraints: list[RestraintCount]
    users_by_role: dict[UserRole, int]
    persons_total: int
    persons_on_the_fly_unlinked: int
    pending_catalog_proposals: int


class AdminExport(BaseModel):
    """Container for the full ``/api/admin/export/all`` payload (ADR-049 §G)."""

    exported_at: datetime
    schema_version: int = 1
    users: list[dict[str, object]]
    persons: list[dict[str, object]]
    events: list[dict[str, object]]
    applications: list[dict[str, object]]
    event_participants: list[dict[str, object]]
    application_restraints: list[dict[str, object]]
    restraint_types: list[dict[str, object]]
