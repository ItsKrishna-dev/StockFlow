"""
tests/test_risk.py

Verify the Inventory Risk Center:
- Detection of large adjustments (> 20% of stock at validation)
- Detection of frequent adjustments (> 3 documents in 24 hours)
- Filtering by severity, product, and warehouse
- Verification that user-facing strings use 'requires review' and never 'fraud'
"""
import uuid
import pytest
import httpx


@pytest.mark.asyncio
async def test_risk_center_large_adjustment(
    manager_client: httpx.AsyncClient,
    staff_client: httpx.AsyncClient,
    seed_data: dict,
):
    unique = uuid.uuid4().hex[:6].upper()
    sku = f"RLG-{unique}"
    uom_id = str(seed_data["uom_pcs"].id)
    wh_id = str(seed_data["warehouse"].id)
    vendor_loc = str(seed_data["loc_vendor"].id)
    main_loc = str(seed_data["loc_main"].id)

    # 1. Create product
    prod = (await manager_client.post(
        "/api/v1/products",
        json={"sku": sku, "name": f"Large Adj Item {sku}", "uom_id": uom_id},
    )).json()
    prod_id = prod["id"]

    # 2. Receipt 100 units
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

    # 3. Create adjustment with physical count = 70 (drops by 30 units = 30% > 20%)
    adj = (await staff_client.post(
        "/api/v1/adjustments",
        json={
            "internal_location_id": main_loc,
            "warehouse_id": wh_id,
            "lines": [
                {
                    "product_id": prod_id,
                    "uom_id": uom_id,
                    "counted_quantity": 70.0,
                    "reason": "Damaged goods discarded",
                }
            ],
        },
    )).json()
    val_res = await manager_client.post(f"/api/v1/adjustments/{adj['id']}/validate")
    assert val_res.status_code == 200

    # 4. Check Risk Center endpoint
    res = await staff_client.get(f"/api/v1/risk-center?severity=high&product_id={prod_id}")
    assert res.status_code == 200, res.text
    findings = res.json()
    assert len(findings) >= 1
    large_adj = next((f for f in findings if f["rule"] == "large_adjustment"), None)
    assert large_adj is not None
    assert large_adj["severity"] == "high"
    assert "requires review" in large_adj["message"].lower()
    assert "fraud" not in large_adj["message"].lower()


@pytest.mark.asyncio
async def test_risk_center_frequent_adjustments(
    manager_client: httpx.AsyncClient,
    staff_client: httpx.AsyncClient,
    seed_data: dict,
):
    unique = uuid.uuid4().hex[:6].upper()
    sku = f"RFQ-{unique}"
    uom_id = str(seed_data["uom_pcs"].id)
    wh_id = str(seed_data["warehouse"].id)
    main_loc = str(seed_data["loc_main"].id)

    # 1. Create product
    prod = (await manager_client.post(
        "/api/v1/products",
        json={"sku": sku, "name": f"Freq Adj Item {sku}", "uom_id": uom_id},
    )).json()
    prod_id = prod["id"]

    # 2. Create 4 adjustment documents in the last 24h
    for i in range(4):
        adj_res = await staff_client.post(
            "/api/v1/adjustments",
            json={
                "internal_location_id": main_loc,
                "warehouse_id": wh_id,
                "lines": [
                    {
                        "product_id": prod_id,
                        "uom_id": uom_id,
                        "counted_quantity": float(i + 1),
                        "reason": f"Audit count round {i+1}",
                    }
                ],
            },
        )
        assert adj_res.status_code == 201

    # 3. Check Risk Center endpoint for frequent adjustments
    res = await staff_client.get(f"/api/v1/risk-center?product_id={prod_id}")
    assert res.status_code == 200, res.text
    findings = res.json()
    freq_adj = next((f for f in findings if f["rule"] == "frequent_adjustments"), None)
    assert freq_adj is not None
    assert freq_adj["severity"] == "medium"
    assert "requires review" in freq_adj["message"].lower()
    assert "fraud" not in freq_adj["message"].lower()
