"""
app/features/risk/service.py

Inventory Risk Center diagnostic services.
Evaluates deterministic operational risk rules for proactive inventory auditing.
Never uses 'fraud' — all alerts indicate operational anomaly and state 'requires review'.
"""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.risk.schemas import RiskFindingOut
from app.models.models import (
    Location,
    Product,
    StockDocument,
    StockDocumentLine,
    StockLedger,
    User,
    Warehouse,
)


async def check_large_adjustments(
    db: AsyncSession,
    product_id: uuid.UUID | None = None,
    warehouse_id: uuid.UUID | None = None,
) -> list[RiskFindingOut]:
    """1. Any single adjustment line where movement quantity exceeds 20% of stock at validation time."""
    now = datetime.now(timezone.utc)
    source_loc = Location.__table__.alias("source_loc")
    dest_loc = Location.__table__.alias("dest_loc")

    query = (
        select(
            StockLedger.id.label("ledger_id"),
            StockDocument.id.label("document_id"),
            StockDocument.document_number,
            Product.id.label("product_id"),
            Product.sku.label("product_sku"),
            Warehouse.id.label("warehouse_id"),
            Warehouse.name.label("warehouse_name"),
            StockLedger.quantity,
            StockLedger.source_qty_after,
            StockLedger.dest_qty_after,
            source_loc.c.type.label("source_type"),
            dest_loc.c.type.label("dest_type"),
            StockLedger.created_at,
        )
        .join(StockDocumentLine, StockLedger.document_line_id == StockDocumentLine.id)
        .join(StockDocument, StockDocumentLine.document_id == StockDocument.id)
        .join(Product, StockLedger.product_id == Product.id)
        .join(source_loc, StockLedger.source_location_id == source_loc.c.id)
        .join(dest_loc, StockLedger.dest_location_id == dest_loc.c.id)
        .outerjoin(Warehouse, StockDocument.warehouse_id == Warehouse.id)
        .where(
            StockDocument.type == "adjustment",
            StockDocument.status == "done",
        )
    )

    if product_id:
        query = query.where(StockLedger.product_id == product_id)
    if warehouse_id:
        query = query.where(StockDocument.warehouse_id == warehouse_id)

    result = await db.execute(query.order_by(StockLedger.created_at.desc()))
    rows = result.all()

    findings: list[RiskFindingOut] = []
    for row in rows:
        qty = Decimal(str(row.quantity))
        # Determine stock level at validation
        if row.source_type == "internal":
            base_stock = Decimal(str(row.source_qty_after or "0")) + qty
        else:
            base_stock = Decimal(str(row.dest_qty_after or "0"))

        if base_stock > Decimal("0"):
            ratio = qty / base_stock
            if ratio > Decimal("0.20"):
                findings.append(
                    RiskFindingOut(
                        rule="large_adjustment",
                        severity="high",
                        message=(
                            f"Large adjustment on document {row.document_number} for {row.product_sku}: "
                            f"movement of {qty} units exceeds 20% of stock ({base_stock}) at validation time; "
                            f"requires review."
                        ),
                        product_id=row.product_id,
                        product_sku=row.product_sku,
                        warehouse_id=row.warehouse_id,
                        warehouse_name=row.warehouse_name,
                        document_id=row.document_id,
                        document_number=row.document_number,
                        detected_at=now,
                    )
                )

    return findings


async def check_frequent_adjustments(
    db: AsyncSession,
    product_id: uuid.UUID | None = None,
    warehouse_id: uuid.UUID | None = None,
) -> list[RiskFindingOut]:
    """2. More than 3 adjustment documents for the same product within a rolling 24-hour window."""
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=24)

    query = (
        select(
            StockDocumentLine.product_id,
            Product.sku.label("product_sku"),
            StockDocument.warehouse_id,
            Warehouse.name.label("warehouse_name"),
            func.count(StockDocument.id.distinct()).label("adj_count"),
        )
        .join(StockDocument, StockDocumentLine.document_id == StockDocument.id)
        .join(Product, StockDocumentLine.product_id == Product.id)
        .outerjoin(Warehouse, StockDocument.warehouse_id == Warehouse.id)
        .where(
            StockDocument.type == "adjustment",
            StockDocument.created_at >= window_start,
        )
        .group_by(
            StockDocumentLine.product_id,
            Product.sku,
            StockDocument.warehouse_id,
            Warehouse.name,
        )
        .having(func.count(StockDocument.id.distinct()) > 3)
    )

    if product_id:
        query = query.where(StockDocumentLine.product_id == product_id)
    if warehouse_id:
        query = query.where(StockDocument.warehouse_id == warehouse_id)

    result = await db.execute(query)
    rows = result.all()

    findings: list[RiskFindingOut] = []
    for row in rows:
        findings.append(
            RiskFindingOut(
                rule="frequent_adjustments",
                severity="medium",
                message=(
                    f"Frequent adjustments for {row.product_sku}: {row.adj_count} adjustment documents "
                    f"created within a 24-hour window; requires review."
                ),
                product_id=row.product_id,
                product_sku=row.product_sku,
                warehouse_id=row.warehouse_id,
                warehouse_name=row.warehouse_name,
                detected_at=now,
            )
        )
    return findings


async def check_repeated_cancellations(
    db: AsyncSession,
    warehouse_id: uuid.UUID | None = None,
) -> list[RiskFindingOut]:
    """3. A user who has canceled more than 3 documents in the last 24 hours."""
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=24)

    query = (
        select(
            StockDocument.created_by.label("user_id"),
            User.full_name.label("user_name"),
            func.count(StockDocument.id).label("cancel_count"),
        )
        .join(User, StockDocument.created_by == User.id)
        .where(
            StockDocument.status == "canceled",
            StockDocument.updated_at >= window_start,
        )
        .group_by(StockDocument.created_by, User.full_name)
        .having(func.count(StockDocument.id) > 3)
    )

    if warehouse_id:
        query = query.where(StockDocument.warehouse_id == warehouse_id)

    result = await db.execute(query)
    rows = result.all()

    findings: list[RiskFindingOut] = []
    for row in rows:
        findings.append(
            RiskFindingOut(
                rule="repeated_cancellations",
                severity="low",
                message=(
                    f"User {row.user_name} has canceled {row.cancel_count} documents "
                    f"within the last 24 hours; requires review."
                ),
                user_id=row.user_id,
                user_name=row.user_name,
                detected_at=now,
            )
        )
    return findings


async def check_recurring_stockouts(
    db: AsyncSession,
    product_id: uuid.UUID | None = None,
    warehouse_id: uuid.UUID | None = None,
) -> list[RiskFindingOut]:
    """4. A product whose stock total has hit 0 more than twice in the last 7 days."""
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=7)

    query = (
        select(
            StockLedger.product_id,
            Product.sku.label("product_sku"),
            Warehouse.id.label("warehouse_id"),
            Warehouse.name.label("warehouse_name"),
            func.count(StockLedger.id).label("zero_count"),
        )
        .join(Product, StockLedger.product_id == Product.id)
        .join(Location, StockLedger.source_location_id == Location.id)
        .outerjoin(Warehouse, Location.warehouse_id == Warehouse.id)
        .where(
            Location.type == "internal",
            StockLedger.source_qty_after == Decimal("0"),
            StockLedger.created_at >= window_start,
        )
        .group_by(
            StockLedger.product_id,
            Product.sku,
            Warehouse.id,
            Warehouse.name,
        )
        .having(func.count(StockLedger.id) > 2)
    )

    if product_id:
        query = query.where(StockLedger.product_id == product_id)
    if warehouse_id:
        query = query.where(Warehouse.id == warehouse_id)

    result = await db.execute(query)
    rows = result.all()

    findings: list[RiskFindingOut] = []
    for row in rows:
        findings.append(
            RiskFindingOut(
                rule="recurring_stockouts",
                severity="medium",
                message=(
                    f"Recurring stockouts for {row.product_sku}: stock reached zero "
                    f"{row.zero_count} times in the last 7 days; requires review."
                ),
                product_id=row.product_id,
                product_sku=row.product_sku,
                warehouse_id=row.warehouse_id,
                warehouse_name=row.warehouse_name,
                detected_at=now,
            )
        )
    return findings


async def run_risk_checks(
    db: AsyncSession,
    severity: str | None = None,
    product_id: uuid.UUID | None = None,
    warehouse_id: uuid.UUID | None = None,
) -> list[RiskFindingOut]:
    """Runs all 4 deterministic risk rules and applies optional filters."""
    all_findings: list[RiskFindingOut] = []

    all_findings.extend(await check_large_adjustments(db, product_id=product_id, warehouse_id=warehouse_id))
    all_findings.extend(await check_frequent_adjustments(db, product_id=product_id, warehouse_id=warehouse_id))
    all_findings.extend(await check_repeated_cancellations(db, warehouse_id=warehouse_id))
    all_findings.extend(await check_recurring_stockouts(db, product_id=product_id, warehouse_id=warehouse_id))

    if severity:
        all_findings = [f for f in all_findings if f.severity == severity]

    return all_findings
