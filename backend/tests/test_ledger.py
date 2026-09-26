"""
tests/test_ledger.py

Verify stock move history audit log and explainable stock timeline:
- Move history query with filters
- Explain stock endpoint (/api/v1/ledger/products/{id}/explain)
"""
import uuid
import pytest
import httpx


@pytest.mark.asyncio
async def test_move_history_and_explain_stock(
    manager_client: httpx.AsyncClient,
    staff_client: httpx.AsyncClient,
    seed_data: dict,
):
    unique = uuid.uuid4().hex[:6]
    sku = f"EXP-{unique.upper()}"
    uom_id = str(seed_data["uom_pcs"].id)
    wh_id = str(seed_data["warehouse"].id)
    vendor_loc_id = str(seed_data["loc_vendor"].id)
    loc_main_id = str(seed_data["loc_main"].id)

    # 1. Create product
    prod = (await manager_client.post("/api/v1/products", json={"sku": sku, "name": f"Explain Product {sku}", "uom_id": uom_id})).json()
    prod_id = prod["id"]

    # 2. Receive 25 units
    rcv = (await manager_client.post(
        "/api/v1/receipts",
        json={
            "vendor_location_id": vendor_loc_id,
            "internal_location_id": loc_main_id,
            "warehouse_id": wh_id,
            "lines": [{"product_id": prod_id, "uom_id": uom_id, "quantity_expected": 25.0, "reason": "Initial batch"}],
        },
    )).json()
    await manager_client.post(f"/api/v1/receipts/{rcv['id']}/validate")

    # 3. Test Move History endpoint
    history_res = await staff_client.get("/api/v1/ledger/move-history?document_type=receipt&status=done")
    assert history_res.status_code == 200, history_res.text
    moves = history_res.json()
    assert len(moves) >= 1
    assert any(m["id"] == rcv["id"] for m in moves)

    # 4. Test Explain Stock endpoint
    explain_res = await staff_client.get(f"/api/v1/ledger/products/{prod_id}/explain")
    assert explain_res.status_code == 200, explain_res.text
    timeline = explain_res.json()
    assert timeline["product_id"] == prod_id
    assert timeline["sku"] == sku
    assert float(timeline["current_total_quantity"]) == 25.0
    assert len(timeline["entries"]) >= 1
    first_entry = timeline["entries"][0]
    assert float(first_entry["quantity"]) == 25.0
    assert first_entry["dest_location_name"] == seed_data["loc_main"].name


@pytest.mark.asyncio
async def test_product_ledger_summary_steel_rods_scenario(
    manager_client: httpx.AsyncClient,
    staff_client: httpx.AsyncClient,
    seed_data: dict,
):
    """
    Test summary endpoint against the Steel Rods scenario:
    Receipt of 100, Transfer of 60, Delivery of 20.
    Assert computed totals match.
    Also test GET /api/v1/ledger/{document_id}.
    """
    unique = uuid.uuid4().hex[:6].upper()
    sku = f"STEEL-{unique}"
    uom_id = str(seed_data["uom_pcs"].id)
    wh_id = str(seed_data["warehouse"].id)
    vendor_loc = str(seed_data["loc_vendor"].id)
    main_loc = str(seed_data["loc_main"].id)
    prod_loc = str(seed_data["loc_prod"].id)
    cust_loc = str(seed_data["loc_cust"].id)

    # 1. Create product
    prod_res = await manager_client.post(
        "/api/v1/products",
        json={"sku": sku, "name": f"Steel Rods {sku}", "uom_id": uom_id},
    )
    assert prod_res.status_code == 201
    prod_id = prod_res.json()["id"]

    # 2. Receipt of 100
    rcpt = (await staff_client.post(
        "/api/v1/receipts",
        json={
            "vendor_location_id": vendor_loc,
            "internal_location_id": main_loc,
            "warehouse_id": wh_id,
            "lines": [{"product_id": prod_id, "uom_id": uom_id, "quantity_expected": 100.0}],
        },
    )).json()
    await staff_client.patch(
        f"/api/v1/receipts/{rcpt['id']}/lines/{rcpt['lines'][0]['id']}",
        json={"quantity_done": 100.0},
    )
    await manager_client.post(f"/api/v1/receipts/{rcpt['id']}/validate")

    # 3. Transfer of 60 (main -> prod)
    trf = (await staff_client.post(
        "/api/v1/transfers",
        json={
            "source_location_id": main_loc,
            "dest_location_id": prod_loc,
            "warehouse_id": wh_id,
            "lines": [{"product_id": prod_id, "uom_id": uom_id, "quantity_expected": 60.0}],
        },
    )).json()
    await staff_client.patch(
        f"/api/v1/transfers/{trf['id']}/lines/{trf['lines'][0]['id']}",
        json={"quantity_done": 60.0},
    )
    await manager_client.post(f"/api/v1/transfers/{trf['id']}/validate")

    # 4. Delivery of 20 (prod -> customer)
    deliv = (await staff_client.post(
        "/api/v1/deliveries",
        json={
            "internal_location_id": prod_loc,
            "customer_location_id": cust_loc,
            "warehouse_id": wh_id,
            "lines": [{"product_id": prod_id, "uom_id": uom_id, "quantity_expected": 20.0}],
        },
    )).json()
    await staff_client.patch(
        f"/api/v1/deliveries/{deliv['id']}/lines/{deliv['lines'][0]['id']}",
        json={"quantity_done": 20.0},
    )
    await manager_client.post(f"/api/v1/deliveries/{deliv['id']}/validate")

    # 5. Call summary endpoint
    summary_res = await staff_client.get(f"/api/v1/ledger/products/{prod_id}/summary")
    assert summary_res.status_code == 200, summary_res.text
    summary = summary_res.json()

    assert summary["product_id"] == prod_id
    assert summary["sku"] == sku
    assert float(summary["opening_quantity"]) == 0.0
    assert float(summary["received_quantity"]) == 100.0
    assert float(summary["transferred_in"]) == 60.0
    assert float(summary["transferred_out"]) == 60.0
    assert float(summary["delivered_quantity"]) == 20.0
    assert float(summary["adjustment_quantity"]) == 0.0
    assert float(summary["closing_quantity"]) == 80.0
    assert summary["operation_count"] == 3
    assert summary["last_movement_at"] is not None

    # 6. Call document detail endpoint
    doc_res = await staff_client.get(f"/api/v1/ledger/{rcpt['id']}")
    assert doc_res.status_code == 200, doc_res.text
    doc_data = doc_res.json()
    assert doc_data["id"] == rcpt["id"]
    assert doc_data["type"] == "receipt"
    assert len(doc_data["lines"]) == 1
    assert float(doc_data["lines"][0]["quantity_expected"]) == 100.0

