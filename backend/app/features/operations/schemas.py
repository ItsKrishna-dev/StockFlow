"""
app/features/operations/schemas.py

Request and response contracts for stock movements:
- Receipts (vendor -> internal)
- Deliveries (internal -> customer)
- Internal Transfers (internal -> internal)
- Inventory Adjustments (virtual_adjustment <-> internal)
"""
import uuid
from decimal import Decimal

from pydantic import BaseModel, Field


class DocumentLineIn(BaseModel):
    product_id: uuid.UUID
    uom_id: uuid.UUID
    quantity_expected: Decimal = Field(gt=0)


class ReceiptCreate(BaseModel):
    vendor_location_id: uuid.UUID
    internal_location_id: uuid.UUID
    warehouse_id: uuid.UUID
    partner_id: uuid.UUID | None = None
    notes: str | None = None
    lines: list[DocumentLineIn] = Field(min_length=1)


class DeliveryCreate(BaseModel):
    internal_location_id: uuid.UUID
    customer_location_id: uuid.UUID
    warehouse_id: uuid.UUID
    partner_id: uuid.UUID | None = None
    notes: str | None = None
    lines: list[DocumentLineIn] = Field(min_length=1)


class TransferCreate(BaseModel):
    source_location_id: uuid.UUID
    dest_location_id: uuid.UUID
    warehouse_id: uuid.UUID
    notes: str | None = None
    lines: list[DocumentLineIn] = Field(min_length=1)


class AdjustmentLineIn(BaseModel):
    product_id: uuid.UUID
    uom_id: uuid.UUID
    counted_quantity: Decimal = Field(ge=0)
    reason: str = Field(min_length=1, max_length=500)


class AdjustmentCreate(BaseModel):
    internal_location_id: uuid.UUID
    warehouse_id: uuid.UUID
    notes: str | None = None
    lines: list[AdjustmentLineIn] = Field(min_length=1)


class LineUpdate(BaseModel):
    quantity_done: Decimal = Field(ge=0)
    reason: str | None = None


class DocumentLineOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    uom_id: uuid.UUID
    quantity_expected: Decimal
    quantity_done: Decimal
    reason: str | None
    model_config = {"from_attributes": True}


class DocumentOut(BaseModel):
    id: uuid.UUID
    document_number: str | None
    type: str
    status: str
    partner_id: uuid.UUID | None
    source_location_id: uuid.UUID
    dest_location_id: uuid.UUID
    warehouse_id: uuid.UUID | None
    notes: str | None
    created_by: uuid.UUID
    validated_by: uuid.UUID | None
    lines: list[DocumentLineOut] = []
    model_config = {"from_attributes": True}
