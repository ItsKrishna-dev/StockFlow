"""
app/api/v1/dashboard.py

Backwards-compatible wrapper re-exporting the dashboard feature router.
"""
from app.features.dashboard.router import (  # noqa: F401
    DashboardKPIs,
    LowStockItem,
    get_kpis,
    get_low_stock_items,
    router,
)

__all__ = ["router", "DashboardKPIs", "LowStockItem"]