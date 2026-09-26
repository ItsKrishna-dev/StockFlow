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


from datetime import datetime


class DocumentLineOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_name: str | None = None
    product_sku: str | None = None
    uom_id: uuid.UUID
    quantity_expected: Decimal
    quantity_done: Decimal
    reason: str | None = None
    model_config = {"from_attributes": True}


class DocumentOut(BaseModel):
    id: uuid.UUID
    document_number: str | None = None
    type: str
    status: str
    partner_id: uuid.UUID | None = None
    partner_name: str | None = None
    source_location_id: uuid.UUID
    source_location_name: str | None = None
    dest_location_id: uuid.UUID
    dest_location_name: str | None = None
    warehouse_id: uuid.UUID | None = None
    warehouse_name: str | None = None
    notes: str | None = None
    created_by: uuid.UUID
    created_by_name: str | None = None
    validated_by: uuid.UUID | None = None
    validated_by_name: str | None = None
    created_at: datetime | None = None
    validated_at: datetime | None = None
    lines: list[DocumentLineOut] = []
    product_name: str | None = None
    product_sku: str | None = None
    total_quantity: Decimal | None = None
    model_config = {"from_attributes": True}
