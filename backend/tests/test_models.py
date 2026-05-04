"""Model-level constraint and behaviour tests (Fahrplan: M1 DoD)."""

from __future__ import annotations

import time
from datetime import UTC, datetime

import pytest
from app.models import Event, Person, User, UserRole
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


def _make_admin(session: Session) -> tuple[Person, User]:
    person = Person(name="Admin Person")
    session.add(person)
    session.flush()
    user = User(
        email="admin@example.invalid",
        hashed_password="argon2id$dummy",
        role=UserRole.ADMIN,
        person_id=person.id,
    )
    session.add(user)
    session.flush()
    return person, user


def test_user_email_unique(db_session: Session) -> None:
    _, user = _make_admin(db_session)
    p2 = Person(name="Other")
    db_session.add(p2)
    db_session.flush()
    db_session.add(
        User(
            email=user.email,
            hashed_password="x",
            role=UserRole.VIEWER,
            person_id=p2.id,
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()


def test_user_person_link_unique(db_session: Session) -> None:
    person, _ = _make_admin(db_session)
    db_session.add(
        User(
            email="other@example.invalid",
            hashed_password="x",
            role=UserRole.EDITOR,
            person_id=person.id,
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()


def test_event_lat_check_constraint(db_session: Session) -> None:
    db_session.add(
        Event(
            started_at=datetime.now(tz=UTC),
            lat=95,
            lon=0,
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()


def test_event_geom_is_computed(db_session: Session) -> None:
    event = Event(
        started_at=datetime.now(tz=UTC),
        lat=52.520008,
        lon=13.404954,
    )
    db_session.add(event)
    db_session.flush()
    wkt = db_session.execute(
        text("SELECT ST_AsText(geom::geometry) FROM event WHERE id = :id"),
        {"id": event.id},
    ).scalar_one()
    assert wkt == "POINT(13.404954 52.520008)"


def test_updated_at_trigger_fires(db_session: Session) -> None:
    person, _ = _make_admin(db_session)
    db_session.flush()
    assert person.updated_at is None
    time.sleep(0.05)
    person.alias = "Patrick"
    db_session.flush()
    updated = db_session.execute(
        select(Person.updated_at).where(Person.id == person.id)
    ).scalar_one()
    assert updated is not None
    assert updated > person.created_at
