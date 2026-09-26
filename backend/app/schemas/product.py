"""
app/schemas/product.py

Re-exports from app.features.products.schemas for backwards compatibility.
"""
from app.features.products.schemas import (
    CategoryCreate,
    CategoryOut,
    ProductCreate,
    ProductOut,
    ProductStockByLocation,
    ProductStockSummary,
    ProductUpdate,
    ReorderRuleCreate,
    ReorderRuleOut,
    UOMCreate,
    UOMOut,
)

__all__ = [
    "CategoryCreate",
    "CategoryOut",
    "UOMCreate",
    "UOMOut",
    "ProductCreate",
    "ProductUpdate",
    "ProductOut",
    "ProductStockByLocation",
    "ProductStockSummary",
    "ReorderRuleCreate",
    "ReorderRuleOut",
]
