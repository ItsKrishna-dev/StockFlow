"""
app/api/v1/warehouses.py

Backwards-compatible wrapper re-exporting the warehouses feature router.
"""
from app.features.warehouses.router import (  # noqa: F401
    create_location,
    create_partner,
    create_warehouse,
    list_locations,
    list_partners,
    list_warehouses,
    router,
)

__all__ = ["router"]
