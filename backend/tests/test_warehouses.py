"""
tests/test_warehouses.py

Verify warehouses, locations, and partner endpoints:
- Warehouse creation, listing, duplicate code validation
- Location creation with strict type-warehouse consistency checks (422 on mismatch)
- Partner creation (vendor, customer, both) and filtered listing
- Role-based access control
"""
import uuid
import pytest
import httpx


@pytest.mark.asyncio
async def test_warehouse_lifecycle(
    manager_client: httpx.AsyncClient,
    staff_client: httpx.AsyncClient,
):
    unique = uuid.uuid4().hex[:4].upper()
    wh_code = f"WH-{unique}"

    # Manager creates warehouse
    create_res = await manager_client.post(
        "/api/v1/warehouses",
        json={"name": f"Warehouse {wh_code}", "code": wh_code, "address": "123 Logistics Way"},
    )
    assert create_res.status_code == 201, create_res.text
    wh = create_res.json()
    assert wh["code"] == wh_code
    assert wh["is_active"] is True

    # Duplicate code fails with 409
    dup_res = await manager_client.post(
        "/api/v1/warehouses",
        json={"name": "Duplicate WH", "code": wh_code},
    )
    assert dup_res.status_code == 409

    # Staff lists warehouses
    list_res = await staff_client.get("/api/v1/warehouses")
    assert list_res.status_code == 200
    assert any(w["code"] == wh_code for w in list_res.json())

    # Staff forbidden from creating warehouse
    staff_attempt = await staff_client.post(
        "/api/v1/warehouses",
        json={"name": "Forbidden WH", "code": f"WH-F-{unique}"},
    )
    assert staff_attempt.status_code == 403


@pytest.mark.asyncio
async def test_location_rules_and_lifecycle(
    manager_client: httpx.AsyncClient,
    staff_client: httpx.AsyncClient,
    seed_data: dict,
):
    wh_id = str(seed_data["warehouse"].id)
    unique = uuid.uuid4().hex[:4].upper()

    # 1. Internal location without warehouse_id must fail with 422
    invalid_internal = await manager_client.post(
        "/api/v1/locations",
        json={"name": "Bad Internal", "code": f"BAD-INT-{unique}", "type": "internal", "warehouse_id": None},
    )
    assert invalid_internal.status_code == 422

    # 2. Vendor location with warehouse_id must fail with 422
    invalid_vendor = await manager_client.post(
        "/api/v1/locations",
        json={"name": "Bad Vendor", "code": f"BAD-VEND-{unique}", "type": "vendor", "warehouse_id": wh_id},
    )
    assert invalid_vendor.status_code == 422

    # 3. Valid internal location
    loc_code = f"LOC-I-{unique}"
    valid_int = await manager_client.post(
        "/api/v1/locations",
        json={"name": f"Aisle {unique}", "code": loc_code, "type": "internal", "warehouse_id": wh_id},
    )
    assert valid_int.status_code == 201, valid_int.text
    loc = valid_int.json()
    assert loc["code"] == loc_code
    assert loc["type"] == "internal"

    # 4. List locations with warehouse_id filter
    list_res = await staff_client.get(f"/api/v1/locations?warehouse_id={wh_id}")
    assert list_res.status_code == 200
    assert any(l["code"] == loc_code for l in list_res.json())


@pytest.mark.asyncio
async def test_partner_lifecycle(
    manager_client: httpx.AsyncClient,
    staff_client: httpx.AsyncClient,
):
    unique = uuid.uuid4().hex[:6]
    partner_name = f"Partner {unique}"

    # Create vendor
    vendor_res = await manager_client.post(
        "/api/v1/partners",
        json={"name": partner_name, "type": "vendor", "email": f"vendor_{unique}@example.com"},
    )
    assert vendor_res.status_code == 201, vendor_res.text
    partner = vendor_res.json()
    assert partner["type"] == "vendor"

    # List partners filtered by type
    list_res = await staff_client.get("/api/v1/partners?type=vendor")
    assert list_res.status_code == 200
    assert any(p["id"] == partner["id"] for p in list_res.json())
