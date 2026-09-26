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
