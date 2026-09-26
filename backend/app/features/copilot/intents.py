"""
app/features/copilot/intents.py

Supported intents for natural language inventory assistance.
"""
INTENTS = [
    "low_stock_products",           # -> calls dashboard/recommendations low-stock function
    "stockout_risk",                 # -> calls recommendations service
    "product_stock_summary",         # -> calls products feature's stock-by-location function
    "product_movement_explanation",  # -> calls ledger summary/explain function
    "inventory_risk_summary",        # -> calls risk-center service
    "pending_operations",            # -> calls dashboard KPI pending counts
    "dashboard_summary",             # -> calls dashboard KPIs
]
