"""
app/api/v1/adjustments.py

Backwards-compatible wrapper re-exporting the adjustments feature router.
"""
from app.features.operations.adjustments_router import (  # noqa: F401
    cancel_adjustment,
    create_adjustment,
    get_adjustment,
    list_adjustments,
    router,
    validate_adjustment,
)

__all__ = ["router"]
