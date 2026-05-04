"""``require_role`` dependency tests (M2 DoD).

The dependency itself is small enough to test without spinning up a route:
we call the inner checker with stand-in user objects and verify the
HTTP error semantics.
"""

from __future__ import annotations

from dataclasses import dataclass

import pytest
from app.deps import require_role
from app.models.user import UserRole
from fastapi import HTTPException


@dataclass
class _FakeUser:
    role: UserRole


async def test_require_role_allows_matching_role() -> None:
    checker = require_role(UserRole.ADMIN)
    user = _FakeUser(role=UserRole.ADMIN)
    result = await checker(user=user)  # type: ignore[arg-type]
    assert result is user


async def test_require_role_allows_any_of_multiple() -> None:
    checker = require_role(UserRole.ADMIN, UserRole.EDITOR)
    user = _FakeUser(role=UserRole.EDITOR)
    result = await checker(user=user)  # type: ignore[arg-type]
    assert result is user


async def test_require_role_rejects_wrong_role() -> None:
    checker = require_role(UserRole.ADMIN)
    user = _FakeUser(role=UserRole.VIEWER)
    with pytest.raises(HTTPException) as exc:
        await checker(user=user)  # type: ignore[arg-type]
    assert exc.value.status_code == 403
