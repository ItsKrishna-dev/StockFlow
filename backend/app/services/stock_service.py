"""
app/services/stock_service.py

Backwards-compatible bridge re-exporting operations and ledger service functions.
"""
from app.features.ledger.service import (
    explain_product_stock,
    get_move_history,
    get_product_ledger_rows as get_product_ledger,
)
from app.features.operations.service import (
    LOCATION_TYPE_RULES,
    InsufficientStockError,
    build_adjustment_lines,
    cancel_document,
    create_document,
    get_document,
    get_virtual_adjustment_location_id,
    list_documents,
    update_line_quantity,
    validate_document,
    validate_location_types,
)

__all__ = [
    "LOCATION_TYPE_RULES",
    "InsufficientStockError",
    "validate_location_types",
    "create_document",
    "get_document",
    "list_documents",
    "update_line_quantity",
    "validate_document",
    "cancel_document",
    "build_adjustment_lines",
    "get_virtual_adjustment_location_id",
    "get_product_ledger",
    "get_move_history",
    "explain_product_stock",
]
