import urllib.request
import json
import uuid

BASE_URL = "http://localhost:8000/api/v1/auth"

def post(url, data):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

def test_auth():
    test_id = f"usr_{uuid.uuid4().hex[:6]}"  # 10 chars, valid (6-12)
    test_email = f"{test_id}@example.com"
    valid_password = "Password@123"  # >8 chars, lowercase, uppercase, symbol

    print("\n--- TEST 1: Valid Sign Up ---")
    status, body = post(f"{BASE_URL}/signup", {
        "login_id": test_id,
        "email": test_email,
        "password": valid_password,
        "role": "warehouse_staff",
        "full_name": "Test User"
    })
    print(f"Status: {status}, Body: {body}")
    assert status == 201, f"Expected 201, got {status}"
    assert body.get("login_id") == test_id
    assert body.get("email") == test_email
    print("PASS: Valid sign up created user in database!")

    print("\n--- TEST 2: Short Login ID (< 6 chars) ---")
    status, body = post(f"{BASE_URL}/signup", {
        "login_id": "abc",
        "email": f"abc_{test_id}@example.com",
        "password": valid_password
    })
    print(f"Status: {status}, Body: {body}")
    assert status in (400, 422), f"Expected 400/422, got {status}"
    print("PASS: Short login ID rejected!")

    print("\n--- TEST 3: Duplicate Email ---")
    status, body = post(f"{BASE_URL}/signup", {
        "login_id": f"dup_{uuid.uuid4().hex[:6]}",
        "email": test_email,
        "password": valid_password
    })
    print(f"Status: {status}, Body: {body}")
    assert status == 400, f"Expected 400, got {status}"
    assert "already registered" in body.get("detail", "")
    print("PASS: Duplicate email rejected!")

    print("\n--- TEST 4: Weak Password (no symbol, <=8 chars) ---")
    status, body = post(f"{BASE_URL}/signup", {
        "login_id": f"usr_{uuid.uuid4().hex[:6]}",
        "email": f"weak_{uuid.uuid4().hex[:6]}@example.com",
        "password": "Password1"  # 9 chars, no symbol
    })
    print(f"Status: {status}, Body: {body}")
    assert status == 400, f"Expected 400, got {status}"
    assert "special character" in body.get("detail", "")
    print("PASS: Weak password rejected!")

    print("\n--- TEST 5: Login with Login ID ---")
    status, body = post(f"{BASE_URL}/login", {
        "login_id": test_id,
        "password": valid_password
    })
    print(f"Status: {status}, Token received: {'access_token' in body}")
    assert status == 200
    assert "access_token" in body
    print("PASS: Login with Login ID succeeded!")

    print("\n--- TEST 6: Login with Email ---")
    status, body = post(f"{BASE_URL}/login", {
        "email": test_email,
        "password": valid_password
    })
    print(f"Status: {status}, Token received: {'access_token' in body}")
    assert status == 200
    assert "access_token" in body
    print("PASS: Login with Email succeeded!")

    print("\n--- TEST 7: Invalid Credentials Error Message ---")
    status, body = post(f"{BASE_URL}/login", {
        "login_id": test_id,
        "password": "WrongPassword@999"
    })
    print(f"Status: {status}, Detail: {body.get('detail')}")
    assert status == 401
    assert body.get("detail") == "Invalid Login Id or Password", f"Unexpected detail: {body.get('detail')}"
    print("PASS: Invalid credentials returned exact string: 'Invalid Login Id or Password'!")

    print("\nALL 7 AUTHENTICATION INTEGRATION TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    test_auth()
