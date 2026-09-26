"""
tests/test_auth.py

Verify authentication and user lifecycle endpoints:
- Registration / Signup
- JSON Login & OAuth2 Swagger UI Token endpoint
- Token refresh
- Profile retrieval (/me)
- Forgot-password OTP request
- Logout and session revocation
"""
import uuid
import pytest
import httpx


@pytest.mark.asyncio
async def test_user_signup_and_duplicate_check(client: httpx.AsyncClient):
    unique_id = uuid.uuid4().hex[:8]
    email = f"user_{unique_id}@example.com"

    payload = {
        "email": email,
        "password": "StrongPassword123!",
        "full_name": "Test Reg User",
        "role": "warehouse_staff",
        "phone": "+1234567890",
    }

    # Test /api/v1/auth/register
    res = await client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["email"] == email
    assert data["full_name"] == "Test Reg User"
    assert data["role"] == "warehouse_staff"
    assert data["is_active"] is True
    assert "id" in data

    # Test duplicate signup fails with 400
    res_dup = await client.post("/api/v1/auth/register", json=payload)
    assert res_dup.status_code == 400
    assert "already exists" in res_dup.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_json_and_token_form(client: httpx.AsyncClient):
    unique_id = uuid.uuid4().hex[:8]
    email = f"login_{unique_id}@example.com"
    password = "SecurePassword123!"

    # Create user first
    signup_res = await client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": password, "full_name": "Login Tester"},
    )
    assert signup_res.status_code == 201, signup_res.text

    # 1. JSON Login (/api/v1/auth/login)
    login_res = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200, login_res.text
    login_data = login_res.json()
    assert "access_token" in login_data
    assert "refresh_token" in login_data
    assert login_data["token_type"] == "bearer"

    # 2. OAuth2 Form (/api/v1/auth/token)
    form_res = await client.post(
        "/api/v1/auth/token",
        data={"username": email, "password": password},
    )
    assert form_res.status_code == 200, form_res.text
    assert "access_token" in form_res.json()

    # 3. Invalid credentials fail with 401
    bad_res = await client.post("/api/v1/auth/login", json={"email": email, "password": "WrongPassword"})
    assert bad_res.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_me(client: httpx.AsyncClient, staff_client: httpx.AsyncClient):
    # Unauthenticated request to /me fails with 401
    unauthed_res = await client.get("/api/v1/auth/me")
    assert unauthed_res.status_code == 401

    # Authenticated request succeeds
    authed_res = await staff_client.get("/api/v1/auth/me")
    assert authed_res.status_code == 200
    user_data = authed_res.json()
    assert user_data["role"] == "warehouse_staff"
    assert "email" in user_data


@pytest.mark.asyncio
async def test_refresh_token_flow(client: httpx.AsyncClient):
    unique_id = uuid.uuid4().hex[:8]
    email = f"refresh_{unique_id}@example.com"
    password = "SecurePassword123!"

    signup_res = await client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": password, "full_name": "Refresh Tester"},
    )
    assert signup_res.status_code == 201, signup_res.text

    login_res = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200, login_res.text
    tokens = login_res.json()
    refresh_tok = tokens["refresh_token"]

    # Exchange refresh token for new pair
    refresh_res = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_tok})
    assert refresh_res.status_code == 200, refresh_res.text
    new_tokens = refresh_res.json()
    assert "access_token" in new_tokens
    assert "refresh_token" in new_tokens
    assert new_tokens["access_token"] != tokens["access_token"]


@pytest.mark.asyncio
async def test_forgot_password_endpoint(client: httpx.AsyncClient):
    res = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "nonexistent_or_existent@example.com"},
    )
    assert res.status_code == 200, res.text
    assert "message" in res.json()


@pytest.mark.asyncio
async def test_logout_endpoint(client: httpx.AsyncClient):
    unique_id = uuid.uuid4().hex[:8]
    email = f"logout_{unique_id}@example.com"
    password = "SecurePassword123!"

    signup_res = await client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": password, "full_name": "Logout Tester"},
    )
    assert signup_res.status_code == 201, signup_res.text

    login_res = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200, login_res.text
    tokens = login_res.json()
    access_token = tokens["access_token"]

    authed_client = httpx.AsyncClient(
        transport=client._transport,
        base_url="http://test",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    logout_res = await authed_client.post("/api/v1/auth/logout", json={"refresh_token": tokens["refresh_token"]})
    assert logout_res.status_code == 200, logout_res.text
    assert "logged out" in logout_res.json()["message"].lower()
    await authed_client.aclose()
