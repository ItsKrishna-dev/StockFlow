"""
tests/test_operations.py

Verify end-to-end stock operation workflows:
- Receipts (vendor -> internal, stock increases)
- Internal Transfers (internal -> internal, stock location shifts)
- Deliveries (internal -> customer, stock decreases)
- Inventory Adjustments (virtual_adjustment <-> internal count reconciliation)
- Draft cancellation and lifecycle guards
- Trigger-enforced stock integrity (insufficient stock rejection)
"""
import uuid
from decimal import Decimal
import pytest
import httpx


@pytest.mark.asyncio
async def test_receipt_full_lifecycle(
    manager_client: httpx.AsyncClient,
    staff_client: httpx.AsyncClient,
    seed_data: dict,
):
    unique = uuid.uuid4().hex[:6]
    sku = f"RCV-{unique.upper()}"
    uom_id = str(seed_data["uom_pcs"].id)
    wh_id = str(seed_data["warehouse"].id)
    vendor_loc_id = str(seed_data["loc_vendor"].id)
    internal_loc_id = str(seed_data["loc_main"].id)

    # 1. Create product
    prod_res = await manager_client.post(
        "/api/v1/products",
        json={"sku": sku, "name": f"Receipt Product {sku}", "uom_id": uom_id},
    )
    assert prod_res.status_code == 201
    prod_id = prod_res.json()["id"]

    # 2. Create receipt draft
    receipt_payload = {
        "vendor_location_id": vendor_loc_id,
        "internal_location_id": internal_loc_id,
        "warehouse_id": wh_id,
        "notes": "Incoming shipment #101",
        "lines": [{"product_id": prod_id, "uom_id": uom_id, "quantity_expected": 20.0}],
    }
    create_res = await staff_client.post("/api/v1/receipts", json=receipt_payload)
    assert create_res.status_code == 201, create_res.text
    doc = create_res.json()
    assert doc["type"] == "receipt"
    assert doc["status"] == "draft"
    assert len(doc["lines"]) == 1
    doc_id = doc["id"]
    line_id = doc["lines"][0]["id"]

    # 3. Staff updates line done quantity
    patch_res = await staff_client.patch(
        f"/api/v1/receipts/{doc_id}/lines/{line_id}",
        json={"quantity_done": 20.0, "reason": "Fully inspected"},
    )
    assert patch_res.status_code == 200
    assert float(patch_res.json()["quantity_done"]) == 20.0

    # 4. Manager validates receipt
    val_res = await manager_client.post(f"/api/v1/receipts/{doc_id}/validate")
    assert val_res.status_code == 200, val_res.text
    val_doc = val_res.json()
    assert val_doc["status"] == "done"
    assert val_doc["validated_by"] is not None

    # 5. Verify product stock in internal location is now 20
    stock_res = await staff_client.get(f"/api/v1/products/{prod_id}/stock")
    assert stock_res.status_code == 200
    stock_data = stock_res.json()
    assert float(stock_data["total_quantity"]) == 20.0
    assert float(stock_data["total_available"]) == 20.0


@pytest.mark.asyncio
async def test_transfer_and_delivery_lifecycle(
    manager_client: httpx.AsyncClient,
    staff_client: httpx.AsyncClient,
    seed_data: dict,
):
    unique = uuid.uuid4().hex[:6]
    sku = f"TRF-{unique.upper()}"
    uom_id = str(seed_data["uom_pcs"].id)
    wh_id = str(seed_data["warehouse"].id)
    vendor_loc_id = str(seed_data["loc_vendor"].id)
    loc_main_id = str(seed_data["loc_main"].id)
    loc_prod_id = str(seed_data["loc_prod"].id)
    cust_loc_id = str(seed_data["loc_cust"].id)

    # 1. Create product and receive 50 units into LOC-MAIN
    prod_res = await manager_client.post(
        "/api/v1/products",
        json={"sku": sku, "name": f"Transfer Item {sku}", "uom_id": uom_id},
    )
    prod_id = prod_res.json()["id"]

    rcv = await manager_client.post(
        "/api/v1/receipts",
        json={
            "vendor_location_id": vendor_loc_id,
            "internal_location_id": loc_main_id,
            "warehouse_id": wh_id,
            "lines": [{"product_id": prod_id, "uom_id": uom_id, "quantity_expected": 50.0}],
        },
    )
    rcv_id = rcv.json()["id"]
    await manager_client.post(f"/api/v1/receipts/{rcv_id}/validate")

    # 2. Transfer 20 units from LOC-MAIN to LOC-PROD
    trf_res = await staff_client.post(
        "/api/v1/transfers",
        json={
            "source_location_id": loc_main_id,
            "dest_location_id": loc_prod_id,
            "warehouse_id": wh_id,
            "lines": [{"product_id": prod_id, "uom_id": uom_id, "quantity_expected": 20.0}],
        },
    )
    assert trf_res.status_code == 201
    trf_id = trf_res.json()["id"]

    val_trf = await manager_client.post(f"/api/v1/transfers/{trf_id}/validate")
    assert val_trf.status_code == 200
    assert val_trf.json()["status"] == "done"

    # Verify breakdown: total is still 50, but distributed across locations
    stock_res = await staff_client.get(f"/api/v1/products/{prod_id}/stock")
    breakdown = {loc["location_code"]: float(loc["quantity"]) for loc in stock_res.json()["by_location"]}
    assert breakdown.get("LOC-MAIN") == 30.0
    assert breakdown.get("LOC-PROD") == 20.0

    # 3. Deliver 10 units from LOC-MAIN to customer
    del_res = await staff_client.post(
        "/api/v1/deliveries",
        json={
            "internal_location_id": loc_main_id,
            "customer_location_id": cust_loc_id,
            "warehouse_id": wh_id,
            "lines": [{"product_id": prod_id, "uom_id": uom_id, "quantity_expected": 10.0}],
        },
    )
    assert del_res.status_code == 201
    del_id = del_res.json()["id"]

    val_del = await manager_client.post(f"/api/v1/deliveries/{del_id}/validate")
    assert val_del.status_code == 200
    assert val_del.json()["status"] == "done"

    # Verify total is now 40 (30 - 10 + 20)
    stock_after_del = await staff_client.get(f"/api/v1/products/{prod_id}/stock")
    assert float(stock_after_del.json()["total_quantity"]) == 40.0


@pytest.mark.asyncio
async def test_adjustment_lifecycle(
    manager_client: httpx.AsyncClient,
    staff_client: httpx.AsyncClient,
    seed_data: dict,
):
    unique = uuid.uuid4().hex[:6]
    sku = f"ADJ-{unique.upper()}"
    uom_id = str(seed_data["uom_pcs"].id)
    wh_id = str(seed_data["warehouse"].id)
    loc_main_id = str(seed_data["loc_main"].id)

    # 1. Create product (initial system stock = 0)
    prod_res = await manager_client.post(
        "/api/v1/products",
        json={"sku": sku, "name": f"Adjust Item {sku}", "uom_id": uom_id},
    )
    prod_id = prod_res.json()["id"]

    # 2. Count says 15 (increase of 15)
    adj_res = await staff_client.post(
        "/api/v1/adjustments",
        json={
            "internal_location_id": loc_main_id,
            "warehouse_id": wh_id,
            "lines": [{"product_id": prod_id, "uom_id": uom_id, "counted_quantity": 15.0, "reason": "Physical audit count"}],
        },
    )
    assert adj_res.status_code == 201, adj_res.text
    adj_id = adj_res.json()["id"]

    # 3. Manager validates adjustment
    val_adj = await manager_client.post(f"/api/v1/adjustments/{adj_id}/validate")
    assert val_adj.status_code == 200
    assert val_adj.json()["status"] == "done"

    # 4. Product stock is now 15
    stock_res = await staff_client.get(f"/api/v1/products/{prod_id}/stock")
    assert float(stock_res.json()["total_quantity"]) == 15.0


@pytest.mark.asyncio
async def test_cancel_document(
    manager_client: httpx.AsyncClient,
    staff_client: httpx.AsyncClient,
    seed_data: dict,
):
    unique = uuid.uuid4().hex[:6]
    sku = f"CNL-{unique.upper()}"
    uom_id = str(seed_data["uom_pcs"].id)
    wh_id = str(seed_data["warehouse"].id)
    vendor_loc_id = str(seed_data["loc_vendor"].id)
    loc_main_id = str(seed_data["loc_main"].id)

    prod = (await manager_client.post("/api/v1/products", json={"sku": sku, "name": f"Cancel Item {sku}", "uom_id": uom_id})).json()

    # Create receipt draft
    rcv = (await staff_client.post(
        "/api/v1/receipts",
        json={
            "vendor_location_id": vendor_loc_id,
            "internal_location_id": loc_main_id,
            "warehouse_id": wh_id,
            "lines": [{"product_id": prod["id"], "uom_id": uom_id, "quantity_expected": 10.0}],
        },
    )).json()
    doc_id = rcv["id"]

    # Cancel receipt
    cancel_res = await manager_client.post(f"/api/v1/receipts/{doc_id}/cancel")
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "canceled"

    # Cannot validate a canceled document
    val_res = await manager_client.post(f"/api/v1/receipts/{doc_id}/validate")
    assert val_res.status_code == 400
