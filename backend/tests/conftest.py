"""
tests/conftest.py

Shared pytest fixtures for testing the StockSense FastAPI application.
Provides configured AsyncClients with role-based auth tokens and seed entity lookups.
"""
import asyncio
from typing import AsyncGenerator

import pytest_asyncio
import httpx
from httpx import ASGITransport
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.main import app
from app.models.models import Location, UnitOfMeasure, User, Warehouse


@pytest_asyncio.fixture(scope="session")
def event_loop():
    """Ensure a single event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """Unauthenticated HTTP client bound to the FastAPI ASGI app."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def _get_or_create_user(role: str, email_prefix: str) -> tuple[str, str]:
    """Helper to ensure a user exists and return their login credentials."""
    email = f"{email_prefix}_{role}@example.com"
    password = "TestPassword123!"

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None:
            user = User(
                email=email,
                password_hash=hash_password(password),
                full_name=f"Test {role.title()}",
                role=role,
                is_active=True,
            )
            session.add(user)
            await session.commit()

    return email, password


async def _get_client_for_role(role: str) -> httpx.AsyncClient:
    transport = ASGITransport(app=app)
    ac = httpx.AsyncClient(transport=transport, base_url="http://test")
    email, password = await _get_or_create_user(role, "test_user")

    res = await ac.post("/api/v1/auth/login", json={"email": email, "password": password})
    if res.status_code != 200:
        raise RuntimeError(f"Failed to authenticate test {role}: {res.text}")

    token = res.json()["access_token"]
    ac.headers["Authorization"] = f"Bearer {token}"
    return ac


@pytest_asyncio.fixture
async def admin_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """Client authenticated as an Admin user."""
    ac = await _get_client_for_role("admin")
    yield ac
    await ac.aclose()


@pytest_asyncio.fixture
async def manager_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """Client authenticated as an Inventory Manager user."""
    ac = await _get_client_for_role("inventory_manager")
    yield ac
    await ac.aclose()


@pytest_asyncio.fixture
async def staff_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """Client authenticated as Warehouse Staff user."""
    ac = await _get_client_for_role("warehouse_staff")
    yield ac
    await ac.aclose()


@pytest_asyncio.fixture
async def seed_data() -> dict:
    """Provides IDs of core seed entities (warehouse, locations, UOMs)."""
    async with AsyncSessionLocal() as session:
        wh_res = await session.execute(select(Warehouse).where(Warehouse.code == "WH-MAIN"))
        warehouse = wh_res.scalar_one_or_none()

        loc_main = (await session.execute(select(Location).where(Location.code == "LOC-MAIN"))).scalar_one_or_none()
        loc_prod = (await session.execute(select(Location).where(Location.code == "LOC-PROD"))).scalar_one_or_none()
        loc_vendor = (await session.execute(select(Location).where(Location.code == "LOC-VENDOR"))).scalar_one_or_none()
        loc_cust = (await session.execute(select(Location).where(Location.code == "LOC-CUSTOMER"))).scalar_one_or_none()
        loc_adj = (await session.execute(select(Location).where(Location.code == "ADJ-VIRTUAL"))).scalar_one_or_none()
        uom_pcs = (await session.execute(select(UnitOfMeasure).where(UnitOfMeasure.code == "PCS"))).scalar_one_or_none()

        return {
            "warehouse": warehouse,
            "loc_main": loc_main,
            "loc_prod": loc_prod,
            "loc_vendor": loc_vendor,
            "loc_cust": loc_cust,
            "loc_adj": loc_adj,
            "uom_pcs": uom_pcs,
        }
