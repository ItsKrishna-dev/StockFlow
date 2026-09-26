"""
tests/test_health.py

Verify health check and database connectivity endpoints.
"""
import pytest
import httpx


@pytest.mark.asyncio
async def test_health_check(client: httpx.AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "environment" in data


@pytest.mark.asyncio
async def test_database_health_check(client: httpx.AsyncClient):
    response = await client.get("/health/db")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "database" in data
    assert "server_time" in data
