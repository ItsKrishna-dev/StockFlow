"""
app/features/ledger/schemas.py

Response contracts for the immutable stock movement audit ledger
and product stock explainability timeline.
"""
import uuid
from decimal import Decimal

from pydantic import BaseModel


class LedgerEntryOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    document_number: str | None
    document_type: str
    source_location_name: str
    dest_location_name: str
    quantity: Decimal
    source_qty_after: Decimal | None
    dest_qty_after: Decimal | None
    performed_by_name: str
    reason: str | None
    created_at: str


class StockTimelineOut(BaseModel):
    product_id: uuid.UUID
    sku: str
    name: str
    current_total_quantity: Decimal
    entries: list[LedgerEntryOut]
