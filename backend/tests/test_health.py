"""Health endpoint tests (Fahrplan: M0 acceptance criterion).

Uses ``app_with_test_db`` so the test session ENV is consistent across
fixtures, even though /health doesn't talk to the DB.
"""

from __future__ import annotations

from httpx import AsyncClient


async def test_health_returns_ok(client: AsyncClient) -> None:
    response = await client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["environment"] in {"development", "test", "production"}


async def test_openapi_is_served(client: AsyncClient) -> None:
    response = await client.get("/api/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "Plus-Map API"
