"""
tests/test_recommendations.py

Verify explainable demand-based replenishment recommendations:
- Calculation of average daily usage, reorder point, stockout days
- Status determination (healthy vs reorder_now)
- Warehouse and product query parameter filtering
"""
import uuid
from decimal import Decimal
import pytest
import httpx


@pytest.mark.asyncio
async def test_reorder_recommendation_calculation(
    manager_client: httpx.AsyncClient,
    staff_client: httpx.AsyncClient,
    seed_data: dict,
):
    unique = uuid.uuid4().hex[:6].upper()
    sku = f"REC-{unique}"
    uom_id = str(seed_data["uom_pcs"].id)
    wh_id = str(seed_data["warehouse"].id)
    vendor_loc = str(seed_data["loc_vendor"].id)
    main_loc = str(seed_data["loc_main"].id)
    cust_loc = str(seed_data["loc_cust"].id)

    # 1. Create product
    prod_res = await manager_client.post(
        "/api/v1/products",
        json={"sku": sku, "name": f"Recommendation Item {sku}", "uom_id": uom_id},
    )
    assert prod_res.status_code == 201
    prod_id = prod_res.json()["id"]

    # 2. Reorder rule: lead time 10 days, safety stock 5, reorder_qty 50
    rule_res = await manager_client.post(
        "/api/v1/reorder-rules",
        json={
            "product_id": prod_id,
            "warehouse_id": wh_id,
            "min_qty": 10.0,
            "max_qty": 100.0,
            "reorder_qty": 50.0,
            "lead_time_days": 10.0,
            "safety_stock_qty": 5.0,
        },
    )
    assert rule_res.status_code == 201

    # 3. Receive 100 units into main location
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

    # 4. Deliver 30 units -> 30 units over 30 days = 1.0/day usage
    deliv = (await staff_client.post(
        "/api/v1/deliveries",
        json={
            "internal_location_id": main_loc,
            "customer_location_id": cust_loc,
            "warehouse_id": wh_id,
            "lines": [{"product_id": prod_id, "uom_id": uom_id, "quantity_expected": 30.0}],
        },
    )).json()
    await staff_client.patch(
        f"/api/v1/deliveries/{deliv['id']}/lines/{deliv['lines'][0]['id']}",
        json={"quantity_done": 30.0},
    )
    await manager_client.post(f"/api/v1/deliveries/{deliv['id']}/validate")

    # 5. Fetch recommendation for this product
    rec_res = await staff_client.get(f"/api/v1/recommendations/reorder?product_id={prod_id}&warehouse_id={wh_id}")
    assert rec_res.status_code == 200, rec_res.text
    recs = rec_res.json()
    assert len(recs) == 1
    rec = recs[0]

    assert rec["product_id"] == prod_id
    assert rec["warehouse_id"] == wh_id
    assert float(rec["current_quantity"]) == 70.0
    assert float(rec["average_daily_usage"]) == 1.0
    assert float(rec["lead_time_days"]) == 10.0
    assert float(rec["safety_stock_qty"]) == 5.0
    # reorder_point = 1.0 * 10.0 + 5.0 = 15.0
    assert float(rec["reorder_point"]) == 15.0
    # estimated_stockout_days = 70 / 1.0 = 70.0
    assert float(rec["estimated_stockout_days"]) == 70.0
    assert rec["status"] == "healthy"
    assert float(rec["recommended_quantity"]) == 50.0
    assert rec["insufficient_history"] is False
    assert "Available stock (70.000) is above the reorder point (15.000)" in rec["explanation"] or "70" in rec["explanation"]

    # 6. Deliver another 60 units (total delivery = 90 units, current_qty = 10 units)
    # average_daily_usage = 90 / 30 = 3.0/day
    # reorder_point = 3.0 * 10.0 + 5.0 = 35.0
    # current_qty = 10.0 <= 35.0 -> reorder_now!
    deliv2 = (await staff_client.post(
        "/api/v1/deliveries",
        json={
            "internal_location_id": main_loc,
            "customer_location_id": cust_loc,
            "warehouse_id": wh_id,
            "lines": [{"product_id": prod_id, "uom_id": uom_id, "quantity_expected": 60.0}],
        },
    )).json()
    await staff_client.patch(
        f"/api/v1/deliveries/{deliv2['id']}/lines/{deliv2['lines'][0]['id']}",
        json={"quantity_done": 60.0},
    )
    await manager_client.post(f"/api/v1/deliveries/{deliv2['id']}/validate")

    rec_res2 = await staff_client.get(f"/api/v1/recommendations/reorder?product_id={prod_id}")
    assert rec_res2.status_code == 200
    recs2 = rec_res2.json()
    assert len(recs2) == 1
    rec2 = recs2[0]

    assert float(rec2["current_quantity"]) == 10.0
    assert float(rec2["average_daily_usage"]) == 3.0
    assert float(rec2["reorder_point"]) == 35.0
    assert rec2["status"] == "reorder_now"
    assert float(rec2["estimated_stockout_days"]) == round(10.0 / 3.0, 1)
