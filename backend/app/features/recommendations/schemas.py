"""
app/features/recommendations/schemas.py

Pydantic schemas for explainable demand-based replenishment recommendations.
Rule-based computation, no machine learning.
"""
import uuid
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict


class ReorderRecommendationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: uuid.UUID
    product_sku: str
    product_name: str
    warehouse_id: uuid.UUID
    warehouse_name: str
    current_quantity: Decimal
    average_daily_usage: Decimal
    lead_time_days: Decimal
    safety_stock_qty: Decimal
    reorder_point: Decimal
    estimated_stockout_days: Decimal | None
    status: Literal["reorder_now", "healthy"]
    recommended_quantity: Decimal
    insufficient_history: bool
    explanation: str
