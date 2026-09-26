"""
app/api/v1/dashboard.py

Landing-page KPIs and the low-stock/reorder view. All values are computed
live from stock_documents, stock_quants, and reorder_rules.
"""

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import (
    Location,
    Product,
    ReorderRule,
    StockDocument,
    StockQuant,
    User,
    Warehouse,
)


router = APIRouter(prefix="/dashboard", tags=["dashboard"])

PENDING_STATUSES = ("draft", "waiting", "ready")


class DashboardKPIs(BaseModel):
    total_products: int
    low_stock_count: int
    out_of_stock_count: int
    pending_receipts: int
    pending_deliveries: int
    scheduled_transfers: int


class LowStockItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: UUID
    sku: str
    name: str
    warehouse_id: UUID
    warehouse_name: str | None
    current_qty: Decimal
    min_qty: Decimal
    reorder_qty: Decimal


@router.get("/kpis", response_model=DashboardKPIs)
async def get_kpis(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DashboardKPIs:
    total_products_result = await db.execute(
        select(func.count())
        .select_from(Product)
        .where(Product.is_active.is_(True))
    )
    total_products = int(total_products_result.scalar_one())

    product_totals = (
        select(
            StockQuant.product_id,
            func.sum(StockQuant.quantity).label("total_qty"),
        )
        .join(Location, StockQuant.location_id == Location.id)
        .where(Location.type == "internal")
        .group_by(StockQuant.product_id)
        .subquery()
    )

    low_stock_result = await db.execute(
        select(func.count())
        .select_from(ReorderRule)
        .outerjoin(
            product_totals,
            product_totals.c.product_id == ReorderRule.product_id,
        )
        .where(
            ReorderRule.is_active.is_(True),
            func.coalesce(product_totals.c.total_qty, Decimal("0"))
            <= ReorderRule.min_qty,
        )
    )
    low_stock_count = int(low_stock_result.scalar_one())

    out_of_stock_result = await db.execute(
        select(func.count())
        .select_from(ReorderRule)
        .outerjoin(
            product_totals,
            product_totals.c.product_id == ReorderRule.product_id,
        )
        .where(
            ReorderRule.is_active.is_(True),
            func.coalesce(product_totals.c.total_qty, Decimal("0"))
            == Decimal("0"),
        )
    )
    out_of_stock_count = int(out_of_stock_result.scalar_one())

    pending_receipts_result = await db.execute(
        select(func.count())
        .select_from(StockDocument)
        .where(
            StockDocument.type == "receipt",
            StockDocument.status.in_(PENDING_STATUSES),
        )
    )
    pending_receipts = int(pending_receipts_result.scalar_one())

    pending_deliveries_result = await db.execute(
        select(func.count())
        .select_from(StockDocument)
        .where(
            StockDocument.type == "delivery",
            StockDocument.status.in_(PENDING_STATUSES),
        )
    )
    pending_deliveries = int(pending_deliveries_result.scalar_one())

    scheduled_transfers_result = await db.execute(
        select(func.count())
        .select_from(StockDocument)
        .where(
            StockDocument.type == "internal_transfer",
            StockDocument.status.in_(PENDING_STATUSES),
        )
    )
    scheduled_transfers = int(scheduled_transfers_result.scalar_one())

    return DashboardKPIs(
        total_products=total_products,
        low_stock_count=low_stock_count,
        out_of_stock_count=out_of_stock_count,
        pending_receipts=pending_receipts,
        pending_deliveries=pending_deliveries,
        scheduled_transfers=scheduled_transfers,
    )


@router.get("/low-stock", response_model=list[LowStockItem])
async def get_low_stock_items(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[LowStockItem]:
    """
    Returns products at or below their configured reorder threshold.

    This is the foundation for the later predictive-reorder feature.
    """

    product_totals = (
        select(
            StockQuant.product_id,
            func.sum(StockQuant.quantity).label("total_qty"),
        )
        .join(Location, StockQuant.location_id == Location.id)
        .where(Location.type == "internal")
        .group_by(StockQuant.product_id)
        .subquery()
    )

    query = (
        select(
            Product.id.label("product_id"),
            Product.sku.label("sku"),
            Product.name.label("name"),
            ReorderRule.warehouse_id.label("warehouse_id"),
            Warehouse.name.label("warehouse_name"),
            func.coalesce(
                product_totals.c.total_qty,
                Decimal("0"),
            ).label("current_qty"),
            ReorderRule.min_qty.label("min_qty"),
            ReorderRule.reorder_qty.label("reorder_qty"),
        )
        .join(
            ReorderRule,
            ReorderRule.product_id == Product.id,
        )
        .outerjoin(
            Warehouse,
            Warehouse.id == ReorderRule.warehouse_id,
        )
        .outerjoin(
            product_totals,
            product_totals.c.product_id == Product.id,
        )
        .where(
            Product.is_active.is_(True),
            ReorderRule.is_active.is_(True),
            func.coalesce(
                product_totals.c.total_qty,
                Decimal("0"),
            )
            <= ReorderRule.min_qty,
        )
        .order_by(Product.name.asc())
    )

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