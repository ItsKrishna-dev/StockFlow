"""
tests/test_products.py

Verify product catalog, categories, UOM, and reorder rule endpoints:
- Categories CRUD and listing
- Units of Measure CRUD and listing
- Product creation, listing, search filter, update
- Stock summary by internal locations
- Reorder rules creation and listing
- Role-based access control (Staff forbidden from creating/modifying)
"""
import uuid
import pytest
import httpx


@pytest.mark.asyncio
async def test_category_lifecycle(manager_client: httpx.AsyncClient, staff_client: httpx.AsyncClient):
    unique = uuid.uuid4().hex[:6]
    cat_name = f"Test Category {unique}"

    # Manager creates category
    create_res = await manager_client.post("/api/v1/categories", json={"name": cat_name})
    assert create_res.status_code == 201, create_res.text
    cat = create_res.json()
    assert cat["name"] == cat_name
    assert "id" in cat

    # Staff lists categories
    list_res = await staff_client.get("/api/v1/categories")
    assert list_res.status_code == 200
    all_cats = list_res.json()
    assert any(c["id"] == cat["id"] for c in all_cats)

    # Staff forbidden from creating category (RBAC)
    staff_create = await staff_client.post("/api/v1/categories", json={"name": "Forbidden Cat"})
    assert staff_create.status_code == 403


@pytest.mark.asyncio
async def test_uom_lifecycle(manager_client: httpx.AsyncClient, staff_client: httpx.AsyncClient):
    unique = uuid.uuid4().hex[:4].upper()
    uom_code = f"U{unique}"

    # Manager creates UOM
    create_res = await manager_client.post(
        "/api/v1/units-of-measure",
        json={"name": f"Unit {uom_code}", "code": uom_code, "uom_category": "unit", "ratio_to_base": "1.0"},
    )
    assert create_res.status_code == 201, create_res.text
    uom = create_res.json()
    assert uom["code"] == uom_code

    # Staff lists UOMs
    list_res = await staff_client.get("/api/v1/units-of-measure")
    assert list_res.status_code == 200
    assert any(u["code"] == uom_code for u in list_res.json())


@pytest.mark.asyncio
async def test_product_lifecycle_and_rbac(
    manager_client: httpx.AsyncClient,
    staff_client: httpx.AsyncClient,
    seed_data: dict,
):
    unique = uuid.uuid4().hex[:6]
    sku = f"SKU-{unique.upper()}"
    uom_id = str(seed_data["uom_pcs"].id)

    # Staff attempt to create product fails with 403
    staff_attempt = await staff_client.post(
        "/api/v1/products",
        json={"sku": sku, "name": "Forbidden Product", "uom_id": uom_id},
    )
    assert staff_attempt.status_code == 403

    # Manager creates product
    create_res = await manager_client.post(
        "/api/v1/products",
        json={"sku": sku, "name": f"Product {sku}", "description": "Test product description", "uom_id": uom_id},
    )
    assert create_res.status_code == 201, create_res.text
    prod = create_res.json()
    assert prod["sku"] == sku
    prod_id = prod["id"]

    # Duplicate SKU fails with 409
    dup_res = await manager_client.post(
        "/api/v1/products",
        json={"sku": sku, "name": "Duplicate SKU Product", "uom_id": uom_id},
    )
    assert dup_res.status_code == 409

    # Get product by ID
    get_res = await staff_client.get(f"/api/v1/products/{prod_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == f"Product {sku}"

    # Search products by SKU
    search_res = await staff_client.get(f"/api/v1/products?search={sku}")
    assert search_res.status_code == 200
    results = search_res.json()
    assert len(results) >= 1
    assert any(p["id"] == prod_id for p in results)

    # Update product (patch)
    patch_res = await manager_client.patch(
        f"/api/v1/products/{prod_id}",
        json={"description": "Updated description by manager"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["description"] == "Updated description by manager"

    # Get product stock summary (initially 0)
    stock_res = await staff_client.get(f"/api/v1/products/{prod_id}/stock")
    assert stock_res.status_code == 200
    stock_data = stock_res.json()
    assert stock_data["sku"] == sku
    assert stock_data["total_quantity"] == "0" or stock_data["total_quantity"] == 0


@pytest.mark.asyncio
async def test_reorder_rules(
    manager_client: httpx.AsyncClient,
    staff_client: httpx.AsyncClient,
    seed_data: dict,
):
    unique = uuid.uuid4().hex[:6]
    sku = f"RR-{unique.upper()}"
    uom_id = str(seed_data["uom_pcs"].id)
    wh_id = str(seed_data["warehouse"].id)

    # Create product for reorder rule
    prod_res = await manager_client.post(
        "/api/v1/products",
        json={"sku": sku, "name": f"Reorder Item {sku}", "uom_id": uom_id},
    )
    assert prod_res.status_code == 201
    prod_id = prod_res.json()["id"]

    # Manager creates reorder rule
    rr_res = await manager_client.post(
        "/api/v1/reorder-rules",
        json={
            "product_id": prod_id,
            "warehouse_id": wh_id,
            "min_qty": 10.0,
            "max_qty": 100.0,
            "reorder_qty": 50.0,
            "lead_time_days": 7.0,
            "safety_stock_qty": 15.0,
        },
    )
    assert rr_res.status_code == 201, rr_res.text
    rule = rr_res.json()
    assert rule["product_id"] == prod_id
    assert rule["is_active"] is True
    assert float(rule["lead_time_days"]) == 7.0
    assert float(rule["safety_stock_qty"]) == 15.0

    # Staff lists reorder rules
    list_res = await staff_client.get(f"/api/v1/reorder-rules?product_id={prod_id}")
    assert list_res.status_code == 200
    rules = list_res.json()
    assert len(rules) >= 1
    matched = next((r for r in rules if r["id"] == rule["id"]), None)
    assert matched is not None
    assert float(matched["lead_time_days"]) == 7.0
    assert float(matched["safety_stock_qty"]) == 15.0

