"""Person-name masking for events with ``reveal_participants=false``.

Per ADR-020 §H, this lives in the service layer because the decision is
per-person and depends on the requester's relationship to the event.
"""

from __future__ import annotations

import uuid

from app.models.event import Event
from app.models.person import Person
from app.schemas.person import PersonRead

PLACEHOLDER = "[verborgen]"


def project_participant(
    person: Person,
    *,
    event: Event,
    requesting_person_id: uuid.UUID,
) -> PersonRead:
    """Return either the real PersonRead or a masked one.

    Rules:
    - ``reveal_participants=true`` -> always real names.
    - The requester sees their own row unmasked.
    - Otherwise the row is masked (name -> placeholder, alias/note dropped).
    """
    base = PersonRead.model_validate(person)
    if event.reveal_participants:
        return base
    if person.id == requesting_person_id:
        return base
    return base.model_copy(update={"name": PLACEHOLDER, "alias": None, "note": None})
