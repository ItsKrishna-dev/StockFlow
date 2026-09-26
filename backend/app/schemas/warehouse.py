"""
app/schemas/warehouse.py

Re-exports from app.features.warehouses.schemas for backwards compatibility.
"""
from app.features.warehouses.schemas import (
    LOCATION_TYPES,
    LocationCreate,
    LocationOut,
    PartnerCreate,
    PartnerOut,
    WarehouseCreate,
    WarehouseOut,
)

__all__ = [
    "LOCATION_TYPES",
    "WarehouseCreate",
    "WarehouseOut",
    "LocationCreate",
    "LocationOut",
    "PartnerCreate",
    "PartnerOut",
]
