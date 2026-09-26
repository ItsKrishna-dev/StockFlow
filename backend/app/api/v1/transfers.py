"""
app/api/v1/transfers.py

Backwards-compatible wrapper re-exporting the transfers feature router.
"""
from app.features.operations.transfers_router import (  # noqa: F401
    cancel_transfer,
    create_transfer,
    get_transfer,
    list_transfers,
    router,
    update_transfer_line,
    validate_transfer,
)

__all__ = ["router"]
