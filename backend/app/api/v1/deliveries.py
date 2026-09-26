"""
app/api/v1/deliveries.py

Backwards-compatible wrapper re-exporting the deliveries feature router.
"""
from app.features.operations.deliveries_router import (  # noqa: F401
    cancel_delivery,
    create_delivery,
    get_delivery,
    list_deliveries,
    router,
    update_delivery_line,
    validate_delivery,
)

__all__ = ["router"]
