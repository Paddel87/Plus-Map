"""Tests for ``app.logging_middleware`` (M11-HOTFIX-003 / ADR-054).

Confirms the structured access log is emitted, route templates replace
concrete IDs, ``X-Request-ID`` round-trips, level escalation tracks
status codes, and the auth-audit events carry only a SHA-256 user-id
hash — never plaintext id or email.
"""

from __future__ import annotations

import re
import uuid

from app.auth.manager import _user_id_hash
from app.models.user import UserRole
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from structlog.testing import capture_logs

from tests.api_helpers import login, login_as, make_user, post_with_csrf

UUID_PATTERN = re.compile(
    r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b",
    re.IGNORECASE,
)


def _http_logs(events: list[dict]) -> list[dict]:
    return [e for e in events if e.get("event") == "http.request"]


def _by_event(events: list[dict], name: str) -> list[dict]:
    return [e for e in events if e.get("event") == name]


async def test_health_emits_http_request_log(client: AsyncClient) -> None:
    with capture_logs() as cap:
        resp = await client.get("/api/health")
    assert resp.status_code == 200
    http_logs = _http_logs(cap)
    assert len(http_logs) == 1
    log = http_logs[0]
    assert log["method"] == "GET"
    assert log["route"] == "/api/health"
    assert log["status"] == 200
    assert log["log_level"] == "info"
    assert isinstance(log["duration_ms"], float)
    assert log["duration_ms"] >= 0
    assert UUID_PATTERN.fullmatch(log["request_id"])


async def test_request_id_passthrough(client: AsyncClient) -> None:
    sent = "00000000-1111-2222-3333-444444444444"
    resp = await client.get("/api/health", headers={"X-Request-ID": sent})
    assert resp.headers["X-Request-ID"] == sent


async def test_request_id_generated_when_absent(client: AsyncClient) -> None:
    resp = await client.get("/api/health")
    received = resp.headers["X-Request-ID"]
    assert UUID_PATTERN.fullmatch(received)


async def test_4xx_status_emits_warning_level(client: AsyncClient) -> None:
    with capture_logs() as cap:
        # /api/events requires auth → 401 without a session cookie
        resp = await client.get("/api/events")
    assert resp.status_code == 401
    http_logs = _http_logs(cap)
    assert len(http_logs) == 1
    assert http_logs[0]["log_level"] == "warning"
    assert http_logs[0]["status"] == 401


async def test_unmatched_path_redacts_uuid(client: AsyncClient) -> None:
    leaked_uuid = "deadbeef-1234-5678-9abc-deadbeefdead"
    with capture_logs() as cap:
        resp = await client.get(f"/api/nonexistent/{leaked_uuid}")
    assert resp.status_code == 404
    http_logs = _http_logs(cap)
    assert len(http_logs) == 1
    route = http_logs[0]["route"]
    assert leaked_uuid not in route
    assert "{redacted_uuid}" in route


async def test_login_failure_emits_auth_event(client: AsyncClient) -> None:
    with capture_logs() as cap:
        resp = await client.post(
            "/api/auth/login",
            data={"username": "ghost@example.com", "password": "WrongPassword12"},
        )
    assert resp.status_code in {400, 401, 422}
    failures = _by_event(cap, "auth.login.failed")
    assert len(failures) == 1
    # No PII: the failure event must not echo the submitted email/password.
    assert "ghost@example.com" not in str(failures[0])


async def test_login_success_emits_audit_with_user_hash(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    user, email, password = await make_user(async_session_factory, role=UserRole.EDITOR)
    expected_hash = _user_id_hash(user.id)
    with capture_logs() as cap:
        await login(client, email, password)
    successes = _by_event(cap, "auth.login.success")
    assert len(successes) == 1
    event = successes[0]
    assert event["user_id_hash"] == expected_hash
    # Must not leak plaintext identifiers
    assert email not in str(event)
    assert str(user.id) not in str(event)


async def test_logout_emits_auth_event(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    with capture_logs() as cap:
        resp = await post_with_csrf(client, csrf, "/api/auth/logout")
    assert resp.status_code in {200, 204}
    assert len(_by_event(cap, "auth.logout.success")) == 1


async def test_user_id_hash_stable_and_truncated() -> None:
    sample = uuid.UUID("00000000-1111-2222-3333-444444444444")
    h1 = _user_id_hash(sample)
    h2 = _user_id_hash(sample)
    assert h1 == h2
    assert len(h1) == 16
    assert re.fullmatch(r"[0-9a-f]{16}", h1)
    # Different uuid → different hash
    other = uuid.UUID("ffffffff-eeee-dddd-cccc-bbbbbbbbbbbb")
    assert _user_id_hash(other) != h1


async def test_route_template_is_used_for_path_with_id(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Concrete UUIDs in path are replaced by FastAPI's route template."""
    await login_as(client, async_session_factory, role=UserRole.EDITOR)
    fake_event_id = "11111111-2222-3333-4444-555555555555"
    with capture_logs() as cap:
        resp = await client.get(f"/api/events/{fake_event_id}")
    # 404 because the event doesn't exist; the matched route template still
    # populates ``request.scope["route"].path`` for the middleware.
    assert resp.status_code in {401, 403, 404}
    http_logs = _http_logs(cap)
    assert len(http_logs) == 1
    route = http_logs[0]["route"]
    assert fake_event_id not in route
    assert "{" in route and "}" in route
