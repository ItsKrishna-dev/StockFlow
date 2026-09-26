"""
app/features/recommendations/service.py

Explainable demand-based replenishment recommendation engine.
Purely rule-based calculations derived from validated consumption history and reorder policies.
No machine learning or external services.
"""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.dashboard.service import build_warehouse_stock_subquery
from app.features.recommendations.schemas import ReorderRecommendationOut
from app.models.models import (
    Location,
    Product,
    ReorderRule,
    StockDocument,
    StockDocumentLine,
    StockLedger,
    Warehouse,
)


async def get_reorder_recommendations(
    db: AsyncSession,
    warehouse_id: uuid.UUID | None = None,
    product_id: uuid.UUID | None = None,
) -> list[ReorderRecommendationOut]:
    """
    Computes explainable demand-based replenishment recommendations
    for active reorder rules.
    """
    trailing_date = datetime.now(timezone.utc) - timedelta(days=30)

    # 1. Trailing 30-day validated delivery quantities by product and warehouse
    usage_subquery = (
        select(
            StockLedger.product_id,
            Location.warehouse_id,
            func.sum(StockLedger.quantity).label("delivery_qty_30d"),
        )
        .join(StockDocumentLine, StockLedger.document_line_id == StockDocumentLine.id)
        .join(StockDocument, StockDocumentLine.document_id == StockDocument.id)
        .join(Location, StockLedger.source_location_id == Location.id)
        .where(
            StockDocument.type == "delivery",
            Location.type == "internal",
            StockLedger.created_at >= trailing_date,
        )
        .group_by(StockLedger.product_id, Location.warehouse_id)
        .subquery()
    )

    # 2. Shared warehouse stock quantity aggregation
    product_totals = build_warehouse_stock_subquery()

    query = (
        select(
            Product.id.label("product_id"),
            Product.sku.label("product_sku"),
            Product.name.label("product_name"),
            Warehouse.id.label("warehouse_id"),
            Warehouse.name.label("warehouse_name"),
            func.coalesce(product_totals.c.total_qty, Decimal("0")).label("current_quantity"),
            func.coalesce(usage_subquery.c.delivery_qty_30d, Decimal("0")).label("delivery_qty_30d"),
            ReorderRule.reorder_qty,
            ReorderRule.lead_time_days,
            ReorderRule.safety_stock_qty,
        )
        .join(Product, ReorderRule.product_id == Product.id)
        .join(Warehouse, ReorderRule.warehouse_id == Warehouse.id)
        .outerjoin(
            product_totals,
            (product_totals.c.product_id == ReorderRule.product_id)
            & (product_totals.c.warehouse_id == ReorderRule.warehouse_id),
        )
        .outerjoin(
            usage_subquery,
            (usage_subquery.c.product_id == ReorderRule.product_id)
            & (usage_subquery.c.warehouse_id == ReorderRule.warehouse_id),
        )
        .where(
            ReorderRule.is_active.is_(True),
            Product.is_active.is_(True),
            Warehouse.is_active.is_(True),
        )
    )

    if warehouse_id:
        query = query.where(ReorderRule.warehouse_id == warehouse_id)
    if product_id:
        query = query.where(ReorderRule.product_id == product_id)

    result = await db.execute(query.order_by(Product.name.asc()))
    rows = result.all()

    recommendations: list[ReorderRecommendationOut] = []
    for row in rows:
        delivery_qty_30d = Decimal(str(row.delivery_qty_30d or "0"))
        if delivery_qty_30d > Decimal("0"):
            average_daily_usage = round(delivery_qty_30d / Decimal("30"), 3)
            insufficient_history = False
        else:
            average_daily_usage = Decimal("0")
            insufficient_history = True

        lead_time_days = Decimal(str(row.lead_time_days or "0"))
        safety_stock_qty = Decimal(str(row.safety_stock_qty or "0"))
        current_quantity = Decimal(str(row.current_quantity or "0"))
        recommended_quantity = Decimal(str(row.reorder_qty or "0"))

        reorder_point = round((average_daily_usage * lead_time_days) + safety_stock_qty, 3)

        if average_daily_usage > Decimal("0"):
            estimated_stockout_days = round(current_quantity / average_daily_usage, 1)
        else:
            estimated_stockout_days = None

        status = "reorder_now" if current_quantity <= reorder_point else "healthy"

        if status == "reorder_now":
            explanation = (
                f"Available stock ({current_quantity}) is at or below the reorder point "
                f"({reorder_point}), calculated from {average_daily_usage}/day usage over "
                f"a {lead_time_days}-day lead time plus {safety_stock_qty} safety stock."
            )
        else:
            explanation = (
                f"Available stock ({current_quantity}) is above the reorder point "
                f"({reorder_point}), calculated from {average_daily_usage}/day usage over "
                f"a {lead_time_days}-day lead time plus {safety_stock_qty} safety stock."
            )

        recommendations.append(
            ReorderRecommendationOut(
                product_id=row.product_id,
                product_sku=row.product_sku,
                product_name=row.product_name,
                warehouse_id=row.warehouse_id,
                warehouse_name=row.warehouse_name,
                current_quantity=current_quantity,
                average_daily_usage=average_daily_usage,
                lead_time_days=lead_time_days,
                safety_stock_qty=safety_stock_qty,
                reorder_point=reorder_point,
                estimated_stockout_days=estimated_stockout_days,
                status=status,
                recommended_quantity=recommended_quantity,
                insufficient_history=insufficient_history,
                explanation=explanation,
            )
        )

    return recommendations
