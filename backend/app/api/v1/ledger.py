"""
app/api/v1/ledger.py

Backwards-compatible wrapper re-exporting the ledger feature router.
"""
from app.features.ledger.router import (  # noqa: F401
    explain_product_stock,
    move_history,
    router,
)

__all__ = ["router"]
