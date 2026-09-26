"""
app/features/risk/schemas.py

Pydantic schemas for the Inventory Risk Center.
Deterministic operational risk signals for proactive warehouse oversight.
"""
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class RiskFindingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rule: str
    severity: Literal["informational", "low", "medium", "high"]
    message: str
    product_id: uuid.UUID | None = None
    product_sku: str | None = None
    warehouse_id: uuid.UUID | None = None
    warehouse_name: str | None = None
    document_id: uuid.UUID | None = None
    document_number: str | None = None
    user_id: uuid.UUID | None = None
    user_name: str | None = None
    detected_at: datetime
