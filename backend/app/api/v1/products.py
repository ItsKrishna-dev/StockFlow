"""
app/api/v1/products.py

Backwards-compatible wrapper re-exporting the products feature router.
"""
from app.features.products.router import (  # noqa: F401
    create_category,
    create_product,
    create_reorder_rule,
    create_uom,
    get_product,
    get_product_stock,
    list_categories,
    list_products,
    list_reorder_rules,
    list_uoms,
    router,
    update_product,
)

__all__ = ["router"]
