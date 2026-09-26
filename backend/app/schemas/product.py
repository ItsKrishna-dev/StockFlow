"""
app/schemas/product.py
Request/response contracts for products, categories, units of measure,
and reorder rules.
"""
import uuid
from decimal import Decimal

from pydantic import BaseModel, Field


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    parent_id: uuid.UUID | None = None


class CategoryOut(CategoryCreate):
    id: uuid.UUID
    model_config = {"from_attributes": True}


class UOMCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    code: str = Field(min_length=1, max_length=10)
    uom_category: str = Field(min_length=1, max_length=30)
    ratio_to_base: Decimal = Field(default=Decimal("1"), gt=0)


class UOMOut(UOMCreate):
    id: uuid.UUID
    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    sku: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    category_id: uuid.UUID | None = None
    uom_id: uuid.UUID
    barcode: str | None = None


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    description: str | None = None
    category_id: uuid.UUID | None = None
    barcode: str | None = None
    is_active: bool | None = None


class ProductOut(BaseModel):
    id: uuid.UUID
    sku: str
    name: str
    description: str | None
    category_id: uuid.UUID | None
    uom_id: uuid.UUID
    barcode: str | None
    is_active: bool
    model_config = {"from_attributes": True}


class ProductStockByLocation(BaseModel):
    location_id: uuid.UUID
    location_name: str
    location_code: str
    warehouse_id: uuid.UUID | None
    quantity: Decimal
    reserved_qty: Decimal
    available_qty: Decimal


class ProductStockSummary(BaseModel):
    product_id: uuid.UUID
    sku: str
    name: str
    total_quantity: Decimal
    total_available: Decimal
    by_location: list[ProductStockByLocation]


class ReorderRuleCreate(BaseModel):
    product_id: uuid.UUID
    warehouse_id: uuid.UUID
    min_qty: Decimal = Field(ge=0)
    max_qty: Decimal = Field(ge=0)
    reorder_qty: Decimal = Field(gt=0)


class ReorderRuleOut(ReorderRuleCreate):
    id: uuid.UUID
    is_active: bool
    model_config = {"from_attributes": True}
