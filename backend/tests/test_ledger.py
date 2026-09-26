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
    assert first_entry["dest_location_name"] == "Main Storage"
