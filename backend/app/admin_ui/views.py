"""ModelView definitions for the SQLAdmin admin UI (ADR-049 §D).

Each view targets one domain table. Edit policies follow the
``Sync-Vertrag`` (ADR-029, ADR-033): ``Application`` is read-only and
``Event`` allows neither create nor hard-delete - those go through the
RxDB sync pipeline.
"""

from __future__ import annotations

from sqladmin import ModelView

from app.models.application import Application, ApplicationRestraint
from app.models.catalog import RestraintType
from app.models.event import Event, EventParticipant
from app.models.person import Person
from app.models.user import User


class UserAdmin(ModelView, model=User):
    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-user"
    column_list = [
        User.email,
        User.role,
        "is_active",
        "is_verified",
        User.person_id,
        User.created_at,
    ]
    column_searchable_list = [User.email]
    column_sortable_list = [User.email, User.role, User.created_at]
    form_excluded_columns = [User.hashed_password, User.created_at, User.updated_at]


class PersonAdmin(ModelView, model=Person):
    name = "Person"
    name_plural = "Persons"
    icon = "fa-solid fa-users"
    column_list = [
        Person.name,
        Person.alias,
        Person.origin,
        "linkable",
        "is_deleted",
        Person.created_at,
    ]
    column_searchable_list = [Person.name, Person.alias]
    column_sortable_list = [Person.name, Person.created_at, Person.origin]
    # The anonymisation columns are surfaced read-only in the form so the
    # admin can spot a soft-deleted row without flipping it by hand;
    # actual anonymisation runs through the dedicated /api/admin endpoint.
    form_excluded_columns = [Person.deleted_at, Person.created_at, Person.updated_at]


class RestraintTypeAdmin(ModelView, model=RestraintType):
    name = "Restraint type"
    name_plural = "Restraint types"
    icon = "fa-solid fa-link"
    column_list = [
        RestraintType.display_name,
        RestraintType.brand,
        RestraintType.model,
        RestraintType.category,
        RestraintType.mechanical_type,
        RestraintType.status,
    ]
    column_searchable_list = [RestraintType.display_name, RestraintType.brand]
    column_sortable_list = [
        RestraintType.display_name,
        RestraintType.status,
        RestraintType.created_at,
    ]
    form_excluded_columns = [RestraintType.created_at, RestraintType.updated_at]


class EventAdmin(ModelView, model=Event):
    """Read + edit only: create and hard-delete go through RxDB sync.

    Editing a small set of recovery columns is allowed (``note``,
    ``reveal_participants``, ``is_deleted``); the ``set_updated_at``
    trigger then bumps ``updated_at`` so a subsequent sync pull
    propagates the change to all clients.
    """

    name = "Event"
    name_plural = "Events"
    icon = "fa-solid fa-calendar"
    can_create = False
    can_delete = False
    column_list = [
        Event.id,
        Event.started_at,
        Event.ended_at,
        Event.lat,
        Event.lon,
        "reveal_participants",
        "is_deleted",
        Event.created_by,
    ]
    column_sortable_list = [Event.started_at, Event.ended_at, Event.created_by]
    form_columns = [
        Event.note,
        "reveal_participants",
        "is_deleted",
    ]


class ApplicationAdmin(ModelView, model=Application):
    """Read-only: every Application mutation flows through the sync API."""

    name = "Application"
    name_plural = "Applications"
    icon = "fa-solid fa-link-slash"
    can_create = False
    can_edit = False
    can_delete = False
    column_list = [
        Application.id,
        Application.event_id,
        Application.sequence_no,
        Application.performer_id,
        Application.recipient_id,
        Application.started_at,
        Application.ended_at,
        "is_deleted",
    ]
    column_sortable_list = [
        Application.event_id,
        Application.sequence_no,
        Application.started_at,
    ]


# ApplicationRestraint and EventParticipant are intentionally not
# exposed: they are internal join tables driven by the sync pipeline
# (ADR-012, ADR-046). Inspecting them in SQLAdmin would tempt manual
# edits that violate the join invariants.

ALL_MODEL_VIEWS: list[type[ModelView]] = [
    UserAdmin,
    PersonAdmin,
    EventAdmin,
    ApplicationAdmin,
    RestraintTypeAdmin,
]

# Re-export the join models so future ADR amendments can opt to surface
# them without touching this list's import header.
__all__ = [
    "ALL_MODEL_VIEWS",
    "ApplicationAdmin",
    "ApplicationRestraint",
    "EventAdmin",
    "EventParticipant",
    "PersonAdmin",
    "RestraintTypeAdmin",
    "UserAdmin",
]
