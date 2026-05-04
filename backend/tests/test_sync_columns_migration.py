"""Tests for the M5b.1 sync-columns migration (ADR-029, ADR-030).

Covers:

1. INSERT on ``event`` and ``application`` sets ``updated_at`` to a
   non-null server-side default (the M1 ``set_updated_at`` trigger only
   fires on UPDATE, so the DB DEFAULT is what guarantees NOT NULL).
2. UPDATE on ``event`` and ``application`` bumps ``updated_at`` via the
   pre-existing ``set_updated_at`` trigger.
3. Soft-deleting an event cascades ``is_deleted = true`` (and
   ``deleted_at``) to every non-deleted child application.
4. Restoring an event (``is_deleted`` true → false) does **not** cascade
   to its applications — restore is intentionally a per-application
   admin action.
5. Soft-deleting an application directly does not touch its parent event.
"""

from __future__ import annotations

import time
from datetime import UTC, datetime
from decimal import Decimal

from app.models import (
    Application,
    Event,
    Person,
    User,
    UserRole,
)
from sqlalchemy import select
from sqlalchemy.orm import Session


def _make_admin(session: Session) -> tuple[Person, User]:
    person = Person(name="Admin")
    session.add(person)
    session.flush()
    user = User(
        email="admin-sync@example.invalid",
        hashed_password="argon2id$dummy",
        role=UserRole.ADMIN,
        person_id=person.id,
    )
    session.add(user)
    session.flush()
    return person, user


def _make_event(session: Session, user: User) -> Event:
    event = Event(
        started_at=datetime.now(tz=UTC),
        lat=Decimal("52.520008"),
        lon=Decimal("13.404954"),
        created_by=user.id,
    )
    session.add(event)
    session.flush()
    return event


def _make_application(
    session: Session,
    event: Event,
    performer: Person,
    recipient: Person,
    sequence_no: int,
) -> Application:
    app = Application(
        event_id=event.id,
        performer_id=performer.id,
        recipient_id=recipient.id,
        sequence_no=sequence_no,
    )
    session.add(app)
    session.flush()
    return app


def test_event_updated_at_is_non_null_on_insert(db_session: Session) -> None:
    _, user = _make_admin(db_session)
    event = _make_event(db_session, user)
    fetched = db_session.execute(select(Event.updated_at).where(Event.id == event.id)).scalar_one()
    assert fetched is not None
    assert fetched >= event.created_at


def test_application_updated_at_is_non_null_on_insert(db_session: Session) -> None:
    person, user = _make_admin(db_session)
    other = Person(name="Recipient")
    db_session.add(other)
    db_session.flush()
    event = _make_event(db_session, user)
    app = _make_application(db_session, event, person, other, sequence_no=1)
    fetched = db_session.execute(
        select(Application.updated_at).where(Application.id == app.id)
    ).scalar_one()
    assert fetched is not None
    assert fetched >= app.created_at


def test_event_updated_at_trigger_bumps_on_update(db_session: Session) -> None:
    _, user = _make_admin(db_session)
    event = _make_event(db_session, user)
    initial = db_session.execute(select(Event.updated_at).where(Event.id == event.id)).scalar_one()
    time.sleep(0.05)
    event.note = "trigger-test"
    db_session.flush()
    after = db_session.execute(select(Event.updated_at).where(Event.id == event.id)).scalar_one()
    assert after > initial


def test_application_updated_at_trigger_bumps_on_update(db_session: Session) -> None:
    person, user = _make_admin(db_session)
    other = Person(name="Recipient2")
    db_session.add(other)
    db_session.flush()
    event = _make_event(db_session, user)
    app = _make_application(db_session, event, person, other, sequence_no=1)
    initial = db_session.execute(
        select(Application.updated_at).where(Application.id == app.id)
    ).scalar_one()
    time.sleep(0.05)
    app.note = "trigger-test"
    db_session.flush()
    after = db_session.execute(
        select(Application.updated_at).where(Application.id == app.id)
    ).scalar_one()
    assert after > initial


def test_event_soft_delete_cascades_to_applications(db_session: Session) -> None:
    person, user = _make_admin(db_session)
    other = Person(name="Recipient3")
    db_session.add(other)
    db_session.flush()
    event = _make_event(db_session, user)
    app1 = _make_application(db_session, event, person, other, sequence_no=1)
    app2 = _make_application(db_session, event, person, other, sequence_no=2)

    event.is_deleted = True
    event.deleted_at = datetime.now(tz=UTC)
    db_session.flush()

    rows = db_session.execute(
        select(Application.id, Application.is_deleted, Application.deleted_at).where(
            Application.id.in_([app1.id, app2.id])
        )
    ).all()
    assert len(rows) == 2
    for _id, is_deleted, deleted_at in rows:
        assert is_deleted is True
        assert deleted_at is not None


def test_event_restore_does_not_cascade_to_applications(db_session: Session) -> None:
    person, user = _make_admin(db_session)
    other = Person(name="Recipient4")
    db_session.add(other)
    db_session.flush()
    event = _make_event(db_session, user)
    app = _make_application(db_session, event, person, other, sequence_no=1)

    # Soft-delete cascades.
    event.is_deleted = True
    event.deleted_at = datetime.now(tz=UTC)
    db_session.flush()
    db_session.refresh(app)
    assert app.is_deleted is True

    # Restore the event. Application stays deleted (per ADR-030 explicit
    # decision: restore is per-application admin action).
    event.is_deleted = False
    event.deleted_at = None
    db_session.flush()
    db_session.refresh(app)
    assert app.is_deleted is True


def test_application_soft_delete_does_not_touch_event(db_session: Session) -> None:
    person, user = _make_admin(db_session)
    other = Person(name="Recipient5")
    db_session.add(other)
    db_session.flush()
    event = _make_event(db_session, user)
    app = _make_application(db_session, event, person, other, sequence_no=1)

    app.is_deleted = True
    app.deleted_at = datetime.now(tz=UTC)
    db_session.flush()
    db_session.refresh(event)
    assert event.is_deleted is False
    assert event.deleted_at is None
