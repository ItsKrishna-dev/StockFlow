"""
tests/test_dashboard.py

Verify dashboard KPIs and low-stock alerting endpoints:
- GET /api/v1/dashboard/kpis
- GET /api/v1/dashboard/low-stock
"""
import uuid
import pytest
import httpx


@pytest.mark.asyncio
async def test_dashboard_kpis_and_low_stock(
    manager_client: httpx.AsyncClient,
    staff_client: httpx.AsyncClient,
    seed_data: dict,
):
    wh_id = str(seed_data["warehouse"].id)
    uom_id = str(seed_data["uom_pcs"].id)
    unique = uuid.uuid4().hex[:6]
    sku = f"KPI-{unique.upper()}"

    # 1. Create a product with a reorder rule (min 10) and stock 0 -> will trigger low stock alert
    prod = (await manager_client.post("/api/v1/products", json={"sku": sku, "name": f"KPI Item {sku}", "uom_id": uom_id})).json()
    prod_id = prod["id"]

    await manager_client.post(
        "/api/v1/reorder-rules",
        json={"product_id": prod_id, "warehouse_id": wh_id, "min_qty": 10.0, "max_qty": 50.0, "reorder_qty": 20.0},
    )

    # 2. Check KPIs endpoint
    kpis_res = await staff_client.get("/api/v1/dashboard/kpis")
    assert kpis_res.status_code == 200, kpis_res.text
    kpis = kpis_res.json()
    assert kpis["total_products"] > 0
    assert kpis["low_stock_count"] >= 1
    assert kpis["out_of_stock_count"] >= 1
    assert "pending_receipts" in kpis
    assert "pending_deliveries" in kpis
    assert "scheduled_transfers" in kpis

    # 3. Check Low Stock items endpoint
    low_stock_res = await staff_client.get("/api/v1/dashboard/low-stock")
    assert low_stock_res.status_code == 200, low_stock_res.text
    low_items = low_stock_res.json()
    assert len(low_items) >= 1
    assert any(item["product_id"] == prod_id for item in low_items)


@pytest.mark.asyncio
async def test_dashboard_warehouse_scoping(
    manager_client: httpx.AsyncClient,
    staff_client: httpx.AsyncClient,
    seed_data: dict,
):
    """
    Assert low-stock calculation is strictly per-warehouse.
    Product in WH1 has 50 pcs (min 20) -> healthy.
    Product in WH2 has 5 pcs (min 10) -> low stock.
    Blended total would be 55 pcs, which would wrongly mask WH2's low stock.
    """
    unique = uuid.uuid4().hex[:6].upper()
    sku = f"SCOPE-{unique}"
    uom_id = str(seed_data["uom_pcs"].id)
    wh1_id = str(seed_data["warehouse"].id)
    loc1_id = str(seed_data["loc_main"].id)
    vendor_loc_id = str(seed_data["loc_vendor"].id)

    # 1. Create a second warehouse and its internal location
    wh2_res = await manager_client.post(
        "/api/v1/warehouses",
        json={"name": f"Warehouse 2 {unique}", "code": f"W2-{unique}"},
    )
    assert wh2_res.status_code == 201, wh2_res.text
    wh2_id = wh2_res.json()["id"]

    loc2_res = await manager_client.post(
        "/api/v1/locations",
        json={"name": f"Loc 2 {unique}", "code": f"L2-{unique}", "type": "internal", "warehouse_id": wh2_id},
    )
    assert loc2_res.status_code == 201, loc2_res.text
    loc2_id = loc2_res.json()["id"]

    # 2. Create product
    prod_res = await manager_client.post(
        "/api/v1/products",
        json={"sku": sku, "name": f"Scoped Product {sku}", "uom_id": uom_id},
    )
    assert prod_res.status_code == 201
    prod_id = prod_res.json()["id"]

    # 3. Create reorder rules in both warehouses
    # WH1: min 20, reorder 30
    await manager_client.post(
        "/api/v1/reorder-rules",
        json={"product_id": prod_id, "warehouse_id": wh1_id, "min_qty": 20.0, "max_qty": 100.0, "reorder_qty": 30.0},
    )
    # WH2: min 10, reorder 20
    await manager_client.post(
        "/api/v1/reorder-rules",
        json={"product_id": prod_id, "warehouse_id": wh2_id, "min_qty": 10.0, "max_qty": 100.0, "reorder_qty": 20.0},
    )

    # 4. Receipt 50 pcs into WH1
    rcpt1 = (await staff_client.post("/api/v1/receipts", json={
        "vendor_location_id": vendor_loc_id,
        "internal_location_id": loc1_id,
        "warehouse_id": wh1_id,
        "lines": [{"product_id": prod_id, "uom_id": uom_id, "quantity_expected": 50.0}],
    })).json()
    await staff_client.patch(
        f"/api/v1/receipts/{rcpt1['id']}/lines/{rcpt1['lines'][0]['id']}",
        json={"quantity_done": 50.0},
    )
    await manager_client.post(f"/api/v1/receipts/{rcpt1['id']}/validate")

    # 5. Receipt 5 pcs into WH2
    rcpt2 = (await staff_client.post("/api/v1/receipts", json={
        "vendor_location_id": vendor_loc_id,
        "internal_location_id": loc2_id,
        "warehouse_id": wh2_id,
        "lines": [{"product_id": prod_id, "uom_id": uom_id, "quantity_expected": 5.0}],
    })).json()
    await staff_client.patch(
        f"/api/v1/receipts/{rcpt2['id']}/lines/{rcpt2['lines'][0]['id']}",
        json={"quantity_done": 5.0},
    )
    await manager_client.post(f"/api/v1/receipts/{rcpt2['id']}/validate")

    # 6. Verify low-stock items endpoint
    low_stock_res = await staff_client.get("/api/v1/dashboard/low-stock")
    assert low_stock_res.status_code == 200
    low_items = low_stock_res.json()

    # Product in WH2 MUST be in low_items with current_qty == 5
    wh2_item = next((item for item in low_items if item["product_id"] == prod_id and item["warehouse_id"] == wh2_id), None)
    assert wh2_item is not None, "Product in WH2 should be low stock"
    assert float(wh2_item["current_qty"]) == 5.0

    # Product in WH1 MUST NOT be in low_items
    wh1_item = next((item for item in low_items if item["product_id"] == prod_id and item["warehouse_id"] == wh1_id), None)
    assert wh1_item is None, "Product in WH1 has 50 pcs (min 20), should not be low stock"

