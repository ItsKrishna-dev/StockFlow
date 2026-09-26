"""
app/features/dashboard/service.py

Computes live dashboard statistics and inventory alert lists directly from
stock_quants, stock_documents, and reorder_rules.
"""
import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.dashboard.schemas import DashboardKPIs, LowStockItem
from app.models.models import (
    Location,
    Product,
    ReorderRule,
    StockDocument,
    StockQuant,
    Warehouse,
)

PENDING_STATUSES = ("draft", "waiting", "ready")


def build_warehouse_stock_subquery():
    """Subquery returning total stock quantity grouped by (product_id, warehouse_id) for internal locations."""
    return (
        select(
            StockQuant.product_id,
            Location.warehouse_id,
            func.sum(StockQuant.quantity).label("total_qty"),
        )
        .join(Location, StockQuant.location_id == Location.id)
        .where(Location.type == "internal")
        .group_by(StockQuant.product_id, Location.warehouse_id)
        .subquery()
    )


async def get_kpis(db: AsyncSession, warehouse_id: uuid.UUID | None = None) -> DashboardKPIs:
    total_products_result = await db.execute(
        select(func.count()).select_from(Product).where(Product.is_active.is_(True))
    )
    total_products = int(total_products_result.scalar_one())

    product_totals = build_warehouse_stock_subquery()

    low_stock_query = (
        select(func.count())
        .select_from(ReorderRule)
        .outerjoin(
            product_totals,
            (product_totals.c.product_id == ReorderRule.product_id)
            & (product_totals.c.warehouse_id == ReorderRule.warehouse_id),
        )
        .where(
            ReorderRule.is_active.is_(True),
            func.coalesce(product_totals.c.total_qty, Decimal("0")) <= ReorderRule.min_qty,
        )
    )
    if warehouse_id:
        low_stock_query = low_stock_query.where(ReorderRule.warehouse_id == warehouse_id)
    low_stock_result = await db.execute(low_stock_query)
    low_stock_count = int(low_stock_result.scalar_one())

    out_of_stock_query = (
        select(func.count())
        .select_from(ReorderRule)
        .outerjoin(
            product_totals,
            (product_totals.c.product_id == ReorderRule.product_id)
            & (product_totals.c.warehouse_id == ReorderRule.warehouse_id),
        )
        .where(
            ReorderRule.is_active.is_(True),
            func.coalesce(product_totals.c.total_qty, Decimal("0")) == Decimal("0"),
        )
    )
    if warehouse_id:
        out_of_stock_query = out_of_stock_query.where(ReorderRule.warehouse_id == warehouse_id)
    out_of_stock_result = await db.execute(out_of_stock_query)
    out_of_stock_count = int(out_of_stock_result.scalar_one())

    pending_receipts_query = (
        select(func.count())
        .select_from(StockDocument)
        .where(
            StockDocument.type == "receipt",
            StockDocument.status.in_(PENDING_STATUSES),
        )
    )
    if warehouse_id:
        pending_receipts_query = pending_receipts_query.where(StockDocument.warehouse_id == warehouse_id)
    pending_receipts_result = await db.execute(pending_receipts_query)
    pending_receipts = int(pending_receipts_result.scalar_one())

    pending_deliveries_query = (
        select(func.count())
        .select_from(StockDocument)
        .where(
            StockDocument.type == "delivery",
            StockDocument.status.in_(PENDING_STATUSES),
        )
    )
    if warehouse_id:
        pending_deliveries_query = pending_deliveries_query.where(StockDocument.warehouse_id == warehouse_id)
    pending_deliveries_result = await db.execute(pending_deliveries_query)
    pending_deliveries = int(pending_deliveries_result.scalar_one())

    scheduled_transfers_query = (
        select(func.count())
        .select_from(StockDocument)
        .where(
            StockDocument.type == "internal_transfer",
            StockDocument.status.in_(PENDING_STATUSES),
        )
    )
    if warehouse_id:
        scheduled_transfers_query = scheduled_transfers_query.where(StockDocument.warehouse_id == warehouse_id)
    scheduled_transfers_result = await db.execute(scheduled_transfers_query)
    scheduled_transfers = int(scheduled_transfers_result.scalar_one())

    return DashboardKPIs(
        total_products=total_products,
        low_stock_count=low_stock_count,
        out_of_stock_count=out_of_stock_count,
        pending_receipts=pending_receipts,
        pending_deliveries=pending_deliveries,
        scheduled_transfers=scheduled_transfers,
    )


async def get_low_stock_items(db: AsyncSession, warehouse_id: uuid.UUID | None = None) -> list[LowStockItem]:
    product_totals = build_warehouse_stock_subquery()

    query = (
        select(
            Product.id.label("product_id"),
            Product.sku.label("sku"),
            Product.name.label("name"),
            ReorderRule.warehouse_id.label("warehouse_id"),
            Warehouse.name.label("warehouse_name"),
            func.coalesce(product_totals.c.total_qty, Decimal("0")).label("current_qty"),
            ReorderRule.min_qty.label("min_qty"),
            ReorderRule.reorder_qty.label("reorder_qty"),
        )
        .join(ReorderRule, ReorderRule.product_id == Product.id)
        .outerjoin(Warehouse, Warehouse.id == ReorderRule.warehouse_id)
        .outerjoin(
            product_totals,
            (product_totals.c.product_id == Product.id)
            & (product_totals.c.warehouse_id == ReorderRule.warehouse_id),
        )
        .where(
            Product.is_active.is_(True),
            ReorderRule.is_active.is_(True),
            func.coalesce(product_totals.c.total_qty, Decimal("0")) <= ReorderRule.min_qty,
        )
    )
    if warehouse_id:
        query = query.where(ReorderRule.warehouse_id == warehouse_id)
    query = query.order_by(Product.name.asc())

    result = await db.execute(query)

    items: list[LowStockItem] = []
    for row in result:
        mapping = row._mapping
        items.append(
            LowStockItem(
                product_id=mapping["product_id"],
                sku=mapping["sku"],
                name=mapping["name"],
                warehouse_id=mapping["warehouse_id"],
                warehouse_name=mapping["warehouse_name"],
                current_qty=mapping["current_qty"] or Decimal("0"),
                min_qty=mapping["min_qty"],
                reorder_qty=mapping["reorder_qty"],
            )
        )

    return items
