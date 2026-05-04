"""Person merge service (M8.3, ADR-049 §E).

Merging is a transactional re-pointing of every Person FK from
``source`` to ``target``:

* ``event_participant`` carries a ``(event_id, person_id)`` UNIQUE
  constraint - if both persons participate in the same event we delete
  the source-side row before the UPDATE.
* ``application.performer_id`` and ``application.recipient_id`` move
  unconditionally; there is no per-event uniqueness on either column.
* ``user.person_id`` is UNIQUE 1:1 (one user = one person). If the
  source person is linked to a User the merge is rejected; merging two
  persons that map to two different users would silently delete an
  identity, which is not what the workflow is for.
* The source row stays in the table (audit trail) but is soft-deleted
  and renamed to ``[merged → <target_uuid>]``.

The function returns a ``MergeResult`` dataclass with the row counts
used both by tests and by the future Next.js wizard's preview step.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

import structlog
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application
from app.models.event import EventParticipant
from app.models.person import Person
from app.models.user import User

logger = structlog.get_logger(__name__)


class PersonMergeError(ValueError):
    """Raised when the pre-checks reject a merge attempt."""


@dataclass(frozen=True)
class MergeResult:
    source_id: uuid.UUID
    target_id: uuid.UUID
    affected_event_participants: int
    deleted_event_participants: int  # rows removed to satisfy the UNIQUE
    affected_applications_performer: int
    affected_applications_recipient: int


async def merge_persons(
    session: AsyncSession,
    *,
    source_id: uuid.UUID,
    target_id: uuid.UUID,
    actor_user_id: uuid.UUID,
) -> MergeResult:
    """Re-point all Person FKs from ``source`` onto ``target``.

    Caller is responsible for the transaction context; we only call
    ``flush`` so the change set is visible to subsequent queries in the
    same transaction.
    """
    if source_id == target_id:
        raise PersonMergeError("Source and target must differ.")

    source = await session.get(Person, source_id)
    target = await session.get(Person, target_id)
    if source is None:
        raise PersonMergeError(f"Source person {source_id} not found.")
    if target is None:
        raise PersonMergeError(f"Target person {target_id} not found.")
    if source.is_deleted:
        raise PersonMergeError("Source person is already deleted/merged.")
    if target.is_deleted:
        raise PersonMergeError("Target person is deleted/merged.")

    # If either side is bound to a User row, refuse - merging would
    # silently invalidate an identity. The admin must first resolve the
    # user link manually (typically by deactivating one user).
    linked_user_q = select(User.id).where(  # type: ignore[call-overload]
        User.person_id.in_([source_id, target_id])
    )
    linked_user_id = await session.scalar(linked_user_q)
    if linked_user_id is not None:
        raise PersonMergeError(
            "Source or target person is linked to a User; resolve the user link first."
        )

    # 1. Drop participant rows on source for events the target is also
    #    in - prevents the (event_id, person_id) UNIQUE collision when
    #    we re-point.
    overlapping_events_q = (
        select(EventParticipant.event_id)
        .where(EventParticipant.person_id == target_id)
        .scalar_subquery()
    )
    delete_overlap = (
        update(EventParticipant)
        .where(EventParticipant.person_id == source_id)
        .where(EventParticipant.event_id.in_(overlapping_events_q))
        .values(is_deleted=True, deleted_at=datetime.now(tz=UTC))
        .execution_options(synchronize_session=False)
    )
    overlap_result = await session.execute(delete_overlap)
    deleted_overlap = overlap_result.rowcount or 0  # type: ignore[attr-defined]

    # 2. Re-point the surviving participant rows.
    move_participants = (
        update(EventParticipant)
        .where(EventParticipant.person_id == source_id)
        .where(EventParticipant.is_deleted.is_(False))
        .values(person_id=target_id)
        .execution_options(synchronize_session=False)
    )
    pp_result = await session.execute(move_participants)
    moved_participants = pp_result.rowcount or 0  # type: ignore[attr-defined]

    # 3. Re-point Application FKs. ``performer`` and ``recipient`` are
    #    independent - one application could carry the source on both
    #    sides (would violate the strict-mode self-bondage rule, but the
    #    DB doesn't enforce that, so handle it).
    move_performer = (
        update(Application)
        .where(Application.performer_id == source_id)
        .values(performer_id=target_id)
        .execution_options(synchronize_session=False)
    )
    perf_result = await session.execute(move_performer)
    moved_performer = perf_result.rowcount or 0  # type: ignore[attr-defined]

    move_recipient = (
        update(Application)
        .where(Application.recipient_id == source_id)
        .values(recipient_id=target_id)
        .execution_options(synchronize_session=False)
    )
    rec_result = await session.execute(move_recipient)
    moved_recipient = rec_result.rowcount or 0  # type: ignore[attr-defined]

    # 4. Soft-delete the source with an audit-friendly marker.
    source.name = f"[merged → {target_id}]"
    source.alias = None
    source.note = None
    source.is_deleted = True
    source.deleted_at = datetime.now(tz=UTC)

    await session.flush()

    result = MergeResult(
        source_id=source_id,
        target_id=target_id,
        affected_event_participants=moved_participants,
        deleted_event_participants=deleted_overlap,
        affected_applications_performer=moved_performer,
        affected_applications_recipient=moved_recipient,
    )

    logger.info(
        "admin.person_merge",
        source_id=str(source_id),
        target_id=str(target_id),
        actor_user_id=str(actor_user_id),
        affected_event_participants=moved_participants,
        deleted_event_participants=deleted_overlap,
        affected_applications_performer=moved_performer,
        affected_applications_recipient=moved_recipient,
    )

    return result
