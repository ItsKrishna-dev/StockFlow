"""
app/api/v1/receipts.py

Backwards-compatible wrapper re-exporting the receipts feature router.
"""
from app.features.operations.receipts_router import (  # noqa: F401
    cancel_receipt,
    create_receipt,
    get_receipt,
    list_receipts,
    router,
    update_receipt_line,
    validate_receipt,
)

__all__ = ["router"]
