"""
app/features/dashboard/schemas.py

Pydantic schemas for executive dashboard metrics and low-stock replenishment views.
"""
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DashboardKPIs(BaseModel):
    total_products: int
    low_stock_count: int
    out_of_stock_count: int
    pending_receipts: int
    pending_deliveries: int
    scheduled_transfers: int


class LowStockItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: UUID
    sku: str
    name: str
    warehouse_id: UUID
    warehouse_name: str | None
    current_qty: Decimal
    min_qty: Decimal
    reorder_qty: Decimal
