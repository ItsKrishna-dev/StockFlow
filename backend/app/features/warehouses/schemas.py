"""
app/features/warehouses/schemas.py

Pydantic request/response contracts for warehouses, locations, partners, and warehouse staff.
"""
import uuid
from pydantic import BaseModel, EmailStr, Field, model_validator

LOCATION_TYPES = {"internal", "vendor", "customer", "virtual_adjustment"}


class WarehouseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    code: str = Field(min_length=1, max_length=20)
    address: str | None = None
    location_names: list[str] | None = None


class WarehouseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    code: str | None = Field(default=None, min_length=1, max_length=20)
    address: str | None = None
    is_active: bool | None = None


class WarehouseOut(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    address: str | None = None
    is_active: bool
    created_at: object | None = None
    model_config = {"from_attributes": True}


class StaffCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=150)
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)
    login_id: str | None = None


class StaffOut(BaseModel):
    id: uuid.UUID
    email: str
    login_id: str | None
    full_name: str
    role: str
    warehouse_id: uuid.UUID | None
    warehouse_name: str | None = None
    is_active: bool
    created_at: object | None = None
    model_config = {"from_attributes": True}


class LocationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    code: str = Field(min_length=1, max_length=30)
    type: str = Field(default="internal")
    warehouse_id: uuid.UUID | None = None
    parent_location_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def check_warehouse_consistency(self) -> "LocationCreate":
        if self.type not in LOCATION_TYPES:
            raise ValueError(f"type must be one of {LOCATION_TYPES}")
        if self.type == "internal" and self.warehouse_id is None:
            raise ValueError("internal locations require a warehouse_id")
        if self.type != "internal" and self.warehouse_id is not None:
            raise ValueError(f"{self.type} locations must not have a warehouse_id")
        return self


class LocationOut(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    type: str
    warehouse_id: uuid.UUID | None
    parent_location_id: uuid.UUID | None
    is_active: bool
    model_config = {"from_attributes": True}


class PartnerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    type: str = Field(pattern="^(vendor|customer|both)$")
    email: str | None = None
    phone: str | None = None
    address: str | None = None


class PartnerOut(PartnerCreate):
    id: uuid.UUID
    is_active: bool
    model_config = {"from_attributes": True}
