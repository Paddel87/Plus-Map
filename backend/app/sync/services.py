"""Sync service: pull cursor queries and push conflict resolution.

Pull
====

``GET /api/sync/{collection}/pull`` walks the rows in
``(updated_at, id)`` order using the composite cursor index introduced
in M5b.1. Soft-deleted rows are returned with ``_deleted = true`` so
the client can drop them locally. RLS filters the result to what the
caller is allowed to see — tombstones included, because they remain
linked via ``event_participant`` until physical deletion.

Push
====

``POST /api/sync/{collection}/push`` accepts RxDB push entries
``[{assumedMasterState, newDocumentState}, ...]`` and applies the
per-field conflict-resolution rules from ADR-029:

* **immutable-after-create:** id, started_at, lat, lon, created_by,
  created_at, event_id, sequence_no. Any mismatch between the existing
  row and ``newDocumentState`` raises a conflict.
* **first-write-wins:** ended_at. Once the server holds a non-null
  value, a different non-null push is a conflict.
* **last-write-wins:** note, reveal_participants, legacy_external_ref
  (ADR-050), performer/recipient, position FKs, ``_deleted``
  (false → true only).
* **server-authoritative:** updated_at, geom, sequence_no on insert,
  created_by/created_at on insert.

Restore (``_deleted`` true → false) is rejected for non-admin callers
per ADR-029.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.exc import IntegrityError, ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application, ApplicationRestraint
from app.models.catalog import (
    ArmPosition,
    CatalogStatus,
    HandOrientation,
    HandPosition,
    RestraintType,
)
from app.models.event import Event, EventParticipant
from app.models.user import User, UserRole
from app.sync.schemas import (
    ApplicationDoc,
    ApplicationPullResponse,
    ApplicationPushItem,
    EventDoc,
    EventParticipantDoc,
    EventParticipantPullResponse,
    EventPullResponse,
    EventPushItem,
    SyncCheckpoint,
)

# ---------------------------------------------------------------------------
# Pull
# ---------------------------------------------------------------------------


async def pull_events(
    session: AsyncSession,
    *,
    checkpoint: SyncCheckpoint | None,
    limit: int,
) -> EventPullResponse:
    """Return events with ``(updated_at, id) > checkpoint`` (or all initially)."""
    stmt = select(Event)
    if checkpoint is not None:
        # Composite cursor comparison written out instead of tuple_(...) to keep
        # mypy + SQLAlchemy typing happy; functionally equivalent.
        stmt = stmt.where(
            or_(
                Event.updated_at > checkpoint.updated_at,
                and_(
                    Event.updated_at == checkpoint.updated_at,
                    Event.id > checkpoint.id,
                ),
            )
        )
    stmt = stmt.order_by(Event.updated_at, Event.id).limit(limit)
    rows = list((await session.execute(stmt)).scalars().all())
    docs = [_event_to_doc(r) for r in rows]
    new_cp: SyncCheckpoint | None
    if rows:
        last = rows[-1]
        new_cp = SyncCheckpoint(updated_at=last.updated_at, id=last.id)
    else:
        new_cp = checkpoint
    return EventPullResponse(documents=docs, checkpoint=new_cp)


async def pull_applications(
    session: AsyncSession,
    *,
    checkpoint: SyncCheckpoint | None,
    limit: int,
) -> ApplicationPullResponse:
    stmt = select(Application)
    if checkpoint is not None:
        stmt = stmt.where(
            or_(
                Application.updated_at > checkpoint.updated_at,
                and_(
                    Application.updated_at == checkpoint.updated_at,
                    Application.id > checkpoint.id,
                ),
            )
        )
    stmt = stmt.order_by(Application.updated_at, Application.id).limit(limit)
    rows = list((await session.execute(stmt)).scalars().all())
    # Bulk-load the n:m set in one query so /pull stays O(N+1) bounded
    # rather than firing one query per application (ADR-046 §B).
    restraint_sets = await _load_restraint_sets(session, [r.id for r in rows])
    docs = [_application_to_doc(r, restraint_sets.get(r.id, [])) for r in rows]
    new_cp: SyncCheckpoint | None
    if rows:
        last = rows[-1]
        new_cp = SyncCheckpoint(updated_at=last.updated_at, id=last.id)
    else:
        new_cp = checkpoint
    return ApplicationPullResponse(documents=docs, checkpoint=new_cp)


async def pull_event_participants(
    session: AsyncSession,
    *,
    checkpoint: SyncCheckpoint | None,
    limit: int,
) -> EventParticipantPullResponse:
    """Cursor-walked pull for ``event_participant`` (M5c.1b, ADR-037).

    Mirrors ``pull_events`` / ``pull_applications`` — same composite
    ``(updated_at, id)`` cursor, same tombstone-aware shape — but
    pull-only (ADR-037 §D); there is no matching push handler.
    """
    stmt = select(EventParticipant)
    if checkpoint is not None:
        stmt = stmt.where(
            or_(
                EventParticipant.updated_at > checkpoint.updated_at,
                and_(
                    EventParticipant.updated_at == checkpoint.updated_at,
                    EventParticipant.id > checkpoint.id,
                ),
            )
        )
    stmt = stmt.order_by(EventParticipant.updated_at, EventParticipant.id).limit(limit)
    rows = list((await session.execute(stmt)).scalars().all())
    docs = [_event_participant_to_doc(r) for r in rows]
    new_cp: SyncCheckpoint | None
    if rows:
        last = rows[-1]
        new_cp = SyncCheckpoint(updated_at=last.updated_at, id=last.id)
    else:
        new_cp = checkpoint
    return EventParticipantPullResponse(documents=docs, checkpoint=new_cp)


# ---------------------------------------------------------------------------
# Push: events
# ---------------------------------------------------------------------------


async def push_events(
    session: AsyncSession,
    items: Sequence[EventPushItem],
    *,
    user: User,
) -> list[EventDoc]:
    """Apply each push item; collect conflicts as server-side master docs."""
    conflicts: list[EventDoc] = []
    for item in items:
        new_doc = item.new_document_state
        existing = await session.get(Event, new_doc.id)

        # Mismatched expectations.
        if existing is not None and item.assumed_master_state is None:
            conflicts.append(_event_to_doc(existing))
            continue
        if existing is None and item.assumed_master_state is not None:
            conflicts.append(_synthetic_event_tombstone(new_doc.id))
            continue

        if existing is None:
            inserted = await _insert_event_or_conflict(session, new_doc, user)
            if inserted is None:
                # Insert failed (RLS / FK / unique). Surface as a tombstone so
                # the client stops retrying this exact id.
                conflicts.append(_synthetic_event_tombstone(new_doc.id))
            continue

        # Update path.
        conflict = _check_event_update(existing, new_doc, user.role)
        if conflict is not None:
            conflicts.append(conflict)
            continue
        was_open = existing.ended_at is None
        _apply_event_update(existing, new_doc)
        try:
            async with session.begin_nested():
                await session.flush()
                # ADR-057: cascade auto-stop to running applications when
                # the event transitions from open to ended.
                if was_open and existing.ended_at is not None:
                    from app.services.events import auto_stop_open_applications

                    await auto_stop_open_applications(session, existing.id, existing.ended_at)
        except (IntegrityError, ProgrammingError):
            # Savepoint already rolled back; outer TX still alive. The local
            # ORM state is dirty but we abandon this item.
            await session.refresh(existing)
            conflicts.append(_event_to_doc(existing))

    return conflicts


async def _insert_event_or_conflict(
    session: AsyncSession,
    new_doc: EventDoc,
    user: User,
) -> Event | None:
    event = Event(
        id=new_doc.id,
        started_at=new_doc.started_at,
        ended_at=new_doc.ended_at,
        lat=Decimal(str(new_doc.lat)),
        lon=Decimal(str(new_doc.lon)),
        legacy_external_ref=new_doc.legacy_external_ref,
        reveal_participants=new_doc.reveal_participants,
        title=new_doc.title,
        note=new_doc.note,
        time_precision=new_doc.time_precision,
        created_by=user.id,
        is_deleted=new_doc.deleted,
        deleted_at=new_doc.deleted_at if new_doc.deleted else None,
    )
    try:
        async with session.begin_nested():
            session.add(event)
            await session.flush()
    except (IntegrityError, ProgrammingError):
        return None
    await session.refresh(event)
    # Auto-participant: creator's person record.
    await _ensure_participant(session, event.id, user.person_id)
    return event


def _check_event_update(
    existing: Event,
    new_doc: EventDoc,
    role: UserRole,
) -> EventDoc | None:
    """Return the server master doc as a conflict, or None to proceed."""
    # Immutable-after-create.
    if (
        existing.started_at != new_doc.started_at
        or float(existing.lat) != new_doc.lat
        or float(existing.lon) != new_doc.lon
        or existing.created_by != new_doc.created_by
    ):
        return _event_to_doc(existing)
    # First-write-wins on ended_at.
    if (
        existing.ended_at is not None
        and new_doc.ended_at is not None
        and existing.ended_at != new_doc.ended_at
    ):
        return _event_to_doc(existing)
    # Restore (true → false) only by admin.
    if existing.is_deleted and not new_doc.deleted and role != UserRole.ADMIN:
        return _event_to_doc(existing)
    return None


def _apply_event_update(existing: Event, new_doc: EventDoc) -> None:
    # FWW: only set ended_at if server didn't have one.
    if existing.ended_at is None and new_doc.ended_at is not None:
        existing.ended_at = new_doc.ended_at
    # LWW.
    existing.title = new_doc.title
    existing.note = new_doc.note
    existing.time_precision = new_doc.time_precision
    existing.reveal_participants = new_doc.reveal_participants
    existing.legacy_external_ref = new_doc.legacy_external_ref
    # Soft-delete flip.
    if new_doc.deleted and not existing.is_deleted:
        existing.is_deleted = True
        existing.deleted_at = new_doc.deleted_at or datetime.now(tz=UTC)
    elif not new_doc.deleted and existing.is_deleted:
        # Admin restore (other roles already rejected upstream).
        existing.is_deleted = False
        existing.deleted_at = None


# ---------------------------------------------------------------------------
# Push: applications
# ---------------------------------------------------------------------------


async def push_applications(
    session: AsyncSession,
    items: Sequence[ApplicationPushItem],
    *,
    user: User,
) -> list[ApplicationDoc]:
    conflicts: list[ApplicationDoc] = []
    for item in items:
        new_doc = item.new_document_state
        existing = await session.get(Application, new_doc.id)

        if existing is not None and item.assumed_master_state is None:
            conflicts.append(await _application_conflict_doc(session, existing))
            continue
        if existing is None and item.assumed_master_state is not None:
            conflicts.append(_synthetic_application_tombstone(new_doc.id, new_doc.event_id))
            continue

        if existing is None:
            # Editor must only link approved restraints; a pending or
            # unknown id is a hard conflict (ADR-046 §C). Catalog FK
            # validation runs before the row insert so we don't have to
            # roll back partial state.
            if not await _restraints_allowed(session, new_doc.restraint_type_ids, user):
                conflicts.append(_synthetic_application_tombstone(new_doc.id, new_doc.event_id))
                continue
            inserted = await _insert_application_or_conflict(session, new_doc, user)
            if inserted is None:
                conflicts.append(_synthetic_application_tombstone(new_doc.id, new_doc.event_id))
                continue
            await _sync_application_restraints(session, inserted.id, new_doc.restraint_type_ids)
            continue

        # Update path.
        conflict = _check_application_update(existing, new_doc, user.role)
        if conflict is not None:
            conflicts.append(await _application_conflict_doc(session, existing))
            continue
        if not await _restraints_allowed(session, new_doc.restraint_type_ids, user):
            conflicts.append(await _application_conflict_doc(session, existing))
            continue
        if not await _position_fks_allowed(session, new_doc, user):
            conflicts.append(await _application_conflict_doc(session, existing))
            continue
        _apply_application_update(existing, new_doc)
        try:
            async with session.begin_nested():
                await session.flush()
        except (IntegrityError, ProgrammingError):
            await session.refresh(existing)
            conflicts.append(await _application_conflict_doc(session, existing))
            continue
        await _sync_application_restraints(session, existing.id, new_doc.restraint_type_ids)

    return conflicts


async def _insert_application_or_conflict(
    session: AsyncSession,
    new_doc: ApplicationDoc,
    user: User,
) -> Application | None:
    if not await _position_fks_allowed(session, new_doc, user):
        return None

    # Server-authoritative sequence_no.
    next_seq = await _next_sequence_no(session, new_doc.event_id)

    application = Application(
        id=new_doc.id,
        event_id=new_doc.event_id,
        performer_id=new_doc.performer_id,
        recipient_id=new_doc.recipient_id,
        arm_position_id=new_doc.arm_position_id,
        hand_position_id=new_doc.hand_position_id,
        hand_orientation_id=new_doc.hand_orientation_id,
        sequence_no=next_seq,
        started_at=new_doc.started_at,
        ended_at=new_doc.ended_at,
        note=new_doc.note,
        created_by=user.id,
        is_deleted=new_doc.deleted,
        deleted_at=new_doc.deleted_at if new_doc.deleted else None,
    )
    try:
        async with session.begin_nested():
            session.add(application)
            await session.flush()
    except (IntegrityError, ProgrammingError):
        return None
    await session.refresh(application)

    # Auto-Participant (ADR-012).
    await _ensure_participant(session, new_doc.event_id, new_doc.performer_id)
    if new_doc.recipient_id != new_doc.performer_id:
        await _ensure_participant(session, new_doc.event_id, new_doc.recipient_id)
    return application


def _check_application_update(
    existing: Application,
    new_doc: ApplicationDoc,
    role: UserRole,
) -> ApplicationDoc | None:
    if (
        existing.event_id != new_doc.event_id
        or existing.sequence_no != new_doc.sequence_no
        or existing.started_at != new_doc.started_at
        or existing.created_by != new_doc.created_by
    ):
        return _application_to_doc(existing)
    if (
        existing.ended_at is not None
        and new_doc.ended_at is not None
        and existing.ended_at != new_doc.ended_at
    ):
        return _application_to_doc(existing)
    if existing.is_deleted and not new_doc.deleted and role != UserRole.ADMIN:
        return _application_to_doc(existing)
    return None


def _apply_application_update(
    existing: Application,
    new_doc: ApplicationDoc,
) -> None:
    if existing.ended_at is None and new_doc.ended_at is not None:
        existing.ended_at = new_doc.ended_at
    existing.performer_id = new_doc.performer_id
    existing.recipient_id = new_doc.recipient_id
    existing.arm_position_id = new_doc.arm_position_id
    existing.hand_position_id = new_doc.hand_position_id
    existing.hand_orientation_id = new_doc.hand_orientation_id
    existing.note = new_doc.note
    if new_doc.deleted and not existing.is_deleted:
        existing.is_deleted = True
        existing.deleted_at = new_doc.deleted_at or datetime.now(tz=UTC)
    elif not new_doc.deleted and existing.is_deleted:
        existing.is_deleted = False
        existing.deleted_at = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _next_sequence_no(session: AsyncSession, event_id: uuid.UUID) -> int:
    current = await session.scalar(
        select(func.max(Application.sequence_no)).where(Application.event_id == event_id)
    )
    return int(current or 0) + 1


async def _ensure_participant(
    session: AsyncSession,
    event_id: uuid.UUID,
    person_id: uuid.UUID,
) -> None:
    """Auto-Participant insert (ADR-012) used by the sync push path.

    M5c.1b (ADR-037 §A) introduced a surrogate ``id`` PK on
    ``event_participant``; uniqueness lives on the new
    ``(event_id, person_id)`` UNIQUE constraint, so we look up by
    query and rely on the constraint to resolve insert races.
    """
    existing = await session.scalar(
        select(EventParticipant).where(
            EventParticipant.event_id == event_id,
            EventParticipant.person_id == person_id,
        )
    )
    if existing is not None:
        return
    try:
        async with session.begin_nested():
            session.add(EventParticipant(event_id=event_id, person_id=person_id))
            await session.flush()
    except (IntegrityError, ProgrammingError):
        # Race: another push inserted the same link. Savepoint already
        # rolled back; outer transaction is intact.
        pass


def _event_to_doc(row: Event) -> EventDoc:
    return EventDoc(
        id=row.id,
        started_at=row.started_at,
        ended_at=row.ended_at,
        lat=float(row.lat),
        lon=float(row.lon),
        legacy_external_ref=row.legacy_external_ref,
        reveal_participants=row.reveal_participants,
        title=row.title,
        note=row.note,
        time_precision=row.time_precision,
        created_by=row.created_by,
        created_at=row.created_at,
        updated_at=row.updated_at,
        deleted_at=row.deleted_at,
        deleted=row.is_deleted,
    )


def _event_participant_to_doc(row: EventParticipant) -> EventParticipantDoc:
    return EventParticipantDoc(
        id=row.id,
        event_id=row.event_id,
        person_id=row.person_id,
        created_at=row.created_at,
        updated_at=row.updated_at,
        deleted_at=row.deleted_at,
        deleted=row.is_deleted,
    )


def _application_to_doc(
    row: Application,
    restraint_type_ids: list[uuid.UUID] | None = None,
) -> ApplicationDoc:
    return ApplicationDoc(
        id=row.id,
        event_id=row.event_id,
        performer_id=row.performer_id,
        recipient_id=row.recipient_id,
        arm_position_id=row.arm_position_id,
        hand_position_id=row.hand_position_id,
        hand_orientation_id=row.hand_orientation_id,
        sequence_no=row.sequence_no,
        started_at=row.started_at,
        ended_at=row.ended_at,
        note=row.note,
        created_by=row.created_by,
        created_at=row.created_at,
        updated_at=row.updated_at,
        deleted_at=row.deleted_at,
        deleted=row.is_deleted,
        restraint_type_ids=list(restraint_type_ids or []),
    )


async def _application_conflict_doc(
    session: AsyncSession,
    row: Application,
) -> ApplicationDoc:
    """Build a master-doc reply for a push conflict, including the live restraint set.

    ADR-046 §D: a Konflikt-Antwort must teach the client the server's
    truth for restraints too, otherwise the client would silently drop
    or reapply the local set on the next push.
    """
    sets = await _load_restraint_sets(session, [row.id])
    return _application_to_doc(row, sets.get(row.id, []))


async def _load_restraint_sets(
    session: AsyncSession,
    application_ids: Sequence[uuid.UUID],
) -> dict[uuid.UUID, list[uuid.UUID]]:
    """Bulk-load `application_restraint` rows for the given application ids.

    Returns ``{application_id: [restraint_type_id, ...]}``. Missing keys
    map to an empty set semantically — the caller materialises ``[]``.
    Sorted by ``restraint_type_id`` to keep the wire format
    deterministic across pulls (helps roundtrip tests stay stable).
    """
    if not application_ids:
        return {}
    stmt = select(
        ApplicationRestraint.application_id,
        ApplicationRestraint.restraint_type_id,
    ).where(ApplicationRestraint.application_id.in_(list(application_ids)))
    rows = list((await session.execute(stmt)).all())
    result: dict[uuid.UUID, list[uuid.UUID]] = {}
    for app_id, rt_id in rows:
        result.setdefault(app_id, []).append(rt_id)
    for app_id in result:
        result[app_id].sort()
    return result


async def _position_fks_allowed(
    session: AsyncSession,
    new_doc: ApplicationDoc,
    user: User,
) -> bool:
    """Editor may only link approved Arm/Hand/Orientation rows.

    Admin pushes bypass status (mirrors the existing Insert-Path
    behaviour). Unknown ids fail too — they would FK-violate later in
    the ORM apply step and surface as opaque ``IntegrityError``.

    Called from both ``_insert_application_or_conflict`` and
    ``push_applications`` (Update-Path) — the latter previously
    skipped the approved-check entirely, which the M7.5-FU2 Position-
    Picker on the Edit-Form would have promoted into a real exposure
    (Editor sees own pending via RLS; without the check, an Editor
    push could attach a pending FK to an existing Application).
    """
    if user.role == UserRole.ADMIN:
        # Admin still needs the row to exist so the FK insert succeeds.
        if (
            new_doc.arm_position_id is not None
            and (await session.get(ArmPosition, new_doc.arm_position_id)) is None
        ):
            return False
        if (
            new_doc.hand_position_id is not None
            and (await session.get(HandPosition, new_doc.hand_position_id)) is None
        ):
            return False
        return not (
            new_doc.hand_orientation_id is not None
            and (await session.get(HandOrientation, new_doc.hand_orientation_id)) is None
        )
    if new_doc.arm_position_id is not None:
        ap = await session.get(ArmPosition, new_doc.arm_position_id)
        if ap is None or ap.status != CatalogStatus.APPROVED:
            return False
    if new_doc.hand_position_id is not None:
        hp = await session.get(HandPosition, new_doc.hand_position_id)
        if hp is None or hp.status != CatalogStatus.APPROVED:
            return False
    if new_doc.hand_orientation_id is not None:
        ho = await session.get(HandOrientation, new_doc.hand_orientation_id)
        if ho is None or ho.status != CatalogStatus.APPROVED:
            return False
    return True


async def _restraints_allowed(
    session: AsyncSession,
    restraint_type_ids: Sequence[uuid.UUID],
    user: User,
) -> bool:
    """Editor may only link approved RestraintTypes (ADR-046 §C).

    Admin pushes bypass the approved-check (mirrors the catalog-FK
    behaviour in :func:`_insert_application_or_conflict`). Unknown ids
    fail too — they would otherwise FK-violate later in
    ``_sync_application_restraints`` and surface as an opaque
    IntegrityError.
    """
    if not restraint_type_ids:
        return True
    if user.role == UserRole.ADMIN:
        # Admin still needs the rows to exist so the FK insert succeeds;
        # status (pending/rejected) is irrelevant to admin.
        existing_rows = list(
            (
                await session.execute(
                    select(RestraintType.id).where(RestraintType.id.in_(list(restraint_type_ids)))
                )
            )
            .scalars()
            .all()
        )
        return len(existing_rows) == len(set(restraint_type_ids))
    rows = list(
        (
            await session.execute(
                select(RestraintType.id, RestraintType.status).where(
                    RestraintType.id.in_(list(restraint_type_ids))
                )
            )
        ).all()
    )
    if len(rows) != len(set(restraint_type_ids)):
        return False
    return all(status == CatalogStatus.APPROVED for _, status in rows)


async def _sync_application_restraints(
    session: AsyncSession,
    application_id: uuid.UUID,
    target_ids: Sequence[uuid.UUID],
) -> None:
    """Replace the n:m set for one application (ADR-046 §C, set-replace LWW).

    Diffs the current rows against ``target_ids`` and issues a single
    DELETE for the removed elements plus an ``INSERT … ON CONFLICT DO
    NOTHING`` for the added ones. RLS already filters writes to
    applications the caller may modify (`application_restraint_editor_modify`
    from M2).
    """
    target = set(target_ids)
    current = set(
        (
            await session.execute(
                select(ApplicationRestraint.restraint_type_id).where(
                    ApplicationRestraint.application_id == application_id
                )
            )
        )
        .scalars()
        .all()
    )
    to_delete = current - target
    to_add = target - current
    if to_delete:
        await session.execute(
            delete(ApplicationRestraint).where(
                ApplicationRestraint.application_id == application_id,
                ApplicationRestraint.restraint_type_id.in_(list(to_delete)),
            )
        )
    for rt_id in to_add:
        try:
            async with session.begin_nested():
                session.add(
                    ApplicationRestraint(
                        application_id=application_id,
                        restraint_type_id=rt_id,
                    )
                )
                await session.flush()
        except (IntegrityError, ProgrammingError):
            # Concurrent push race: row already inserted. PK will absorb;
            # outer transaction stays alive.
            pass


def _synthetic_event_tombstone(event_id: uuid.UUID) -> EventDoc:
    """RxDB needs a master-doc shape even when the row is gone — fake a tombstone."""
    now = datetime.now(tz=UTC)
    return EventDoc(
        id=event_id,
        started_at=now,
        ended_at=None,
        lat=0.0,
        lon=0.0,
        legacy_external_ref=None,
        reveal_participants=False,
        note=None,
        created_by=None,
        created_at=now,
        updated_at=now,
        deleted_at=now,
        deleted=True,
    )


def _synthetic_application_tombstone(
    application_id: uuid.UUID,
    event_id: uuid.UUID,
) -> ApplicationDoc:
    now = datetime.now(tz=UTC)
    return ApplicationDoc(
        id=application_id,
        event_id=event_id,
        performer_id=uuid.UUID(int=0),
        recipient_id=uuid.UUID(int=0),
        sequence_no=1,
        started_at=None,
        ended_at=None,
        note=None,
        created_by=None,
        created_at=now,
        updated_at=now,
        deleted_at=now,
        deleted=True,
    )
