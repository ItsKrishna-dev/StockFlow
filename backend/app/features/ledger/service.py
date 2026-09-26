"""
app/features/ledger/service.py

Audit and projection services over stock_ledger and stock_documents.
Read-only queries — nothing in this service writes to the database.
"""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, selectinload

from app.features.ledger.schemas import (
    LedgerEntryOut,
    ProductLedgerSummaryOut,
    StockTimelineOut,
)
from app.models.models import (
    Location,
    Product,
    StockDocument,
    StockDocumentLine,
    StockLedger,
    StockQuant,
    User,
)


async def get_move_history(
    db: AsyncSession,
    document_type: str | None = None,
    status_filter: str | None = None,
    warehouse_id: uuid.UUID | None = None,
    limit: int = 200,
) -> list[StockDocument]:
    query = select(StockDocument).options(selectinload(StockDocument.lines))
    if document_type:
        query = query.where(StockDocument.type == document_type)
    if status_filter:
        query = query.where(StockDocument.status == status_filter)
    if warehouse_id:
        query = query.where(StockDocument.warehouse_id == warehouse_id)

    result = await db.execute(query.order_by(StockDocument.created_at.desc()).limit(limit))
    return list(result.scalars().all())


async def get_product_ledger_rows(
    db: AsyncSession,
    product_id: uuid.UUID,
    limit: int = 50,
) -> list[dict]:
    """Raw rows for the explainable stock timeline."""
    source_loc = Location.__table__.alias("source_loc")
    dest_loc = Location.__table__.alias("dest_loc")

    query = (
        select(
            StockLedger.id,
            StockLedger.product_id,
            StockDocument.document_number,
            StockDocument.type,
            source_loc.c.name.label("source_location_name"),
            dest_loc.c.name.label("dest_location_name"),
            StockLedger.quantity,
            StockLedger.source_qty_after,
            StockLedger.dest_qty_after,
            User.full_name.label("performed_by_name"),
            StockDocumentLine.reason,
            StockLedger.created_at,
        )
        .join(StockDocumentLine, StockLedger.document_line_id == StockDocumentLine.id)
        .join(StockDocument, StockDocumentLine.document_id == StockDocument.id)
        .join(source_loc, StockLedger.source_location_id == source_loc.c.id)
        .join(dest_loc, StockLedger.dest_location_id == dest_loc.c.id)
        .join(User, StockLedger.performed_by == User.id)
        .where(StockLedger.product_id == product_id)
        .order_by(StockLedger.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    return [dict(row._mapping) for row in result]


async def explain_product_stock(
    db: AsyncSession,
    product_id: uuid.UUID,
    limit: int = 50,
) -> StockTimelineOut:
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    rows = await get_product_ledger_rows(db, product_id, limit=limit)

    entries = [
        LedgerEntryOut(
            id=row["id"],
            product_id=row["product_id"],
            document_number=row["document_number"],
            document_type=row["type"],
            source_location_name=row["source_location_name"],
            dest_location_name=row["dest_location_name"],
            quantity=row["quantity"],
            source_qty_after=row["source_qty_after"],
            dest_qty_after=row["dest_qty_after"],
            performed_by_name=row["performed_by_name"],
            reason=row["reason"],
            created_at=row["created_at"].isoformat(),
        )
        for row in rows
    ]

    total_result = await db.execute(
        select(StockQuant.quantity).where(StockQuant.product_id == product_id)
    )
    current_total = sum((q for q in total_result.scalars().all()), start=Decimal("0"))

    return StockTimelineOut(
        product_id=product.id,
        sku=product.sku,
        name=product.name,
        current_total_quantity=current_total,
        entries=entries,
    )


async def get_ledger_document(db: AsyncSession, document_id: uuid.UUID) -> StockDocument:
    """Retrieve full detail of a single document with lines."""
    result = await db.execute(
        select(StockDocument)
        .options(selectinload(StockDocument.lines))
        .where(StockDocument.id == document_id)
    )
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


async def get_product_ledger_summary(
    db: AsyncSession,
    product_id: uuid.UUID,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> ProductLedgerSummaryOut:
    """Aggregate stock movements for a product over a given date range using SQL aggregation."""
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    now = datetime.now(timezone.utc)
    if date_to is None:
        date_to = now
    elif date_to.tzinfo is None:
        date_to = date_to.replace(tzinfo=timezone.utc)

    if date_from is None:
        date_from = date_to - timedelta(days=30)
    elif date_from.tzinfo is None:
        date_from = date_from.replace(tzinfo=timezone.utc)

    source_loc_alias = aliased(Location)
    dest_loc_alias = aliased(Location)

    # 1. Opening balance before date_from
    opening_query = (
        select(
            func.coalesce(
                func.sum(
                    case((dest_loc_alias.type == "internal", StockLedger.quantity), else_=Decimal("0"))
                    - case((source_loc_alias.type == "internal", StockLedger.quantity), else_=Decimal("0"))
                ),
                Decimal("0"),
            )
        )
        .join(dest_loc_alias, StockLedger.dest_location_id == dest_loc_alias.id)
        .join(source_loc_alias, StockLedger.source_location_id == source_loc_alias.id)
        .where(
            StockLedger.product_id == product_id,
            StockLedger.created_at < date_from,
        )
    )
    opening_result = await db.execute(opening_query)
    opening_quantity = Decimal(str(opening_result.scalar_one() or "0"))

    # 2. SQL aggregation grouped by document type
    period_query = (
        select(
            StockDocument.type.label("doc_type"),
            func.sum(StockLedger.quantity).label("total_qty"),
            func.sum(
                case((dest_loc_alias.type == "internal", StockLedger.quantity), else_=Decimal("0"))
            ).label("in_qty"),
            func.sum(
                case((source_loc_alias.type == "internal", StockLedger.quantity), else_=Decimal("0"))
            ).label("out_qty"),
            func.count(StockLedger.id).label("op_count"),
            func.max(StockLedger.created_at).label("last_created_at"),
        )
        .join(StockDocumentLine, StockLedger.document_line_id == StockDocumentLine.id)
        .join(StockDocument, StockDocumentLine.document_id == StockDocument.id)
        .join(dest_loc_alias, StockLedger.dest_location_id == dest_loc_alias.id)
        .join(source_loc_alias, StockLedger.source_location_id == source_loc_alias.id)
        .where(
            StockLedger.product_id == product_id,
            StockLedger.created_at >= date_from,
            StockLedger.created_at <= date_to,
        )
        .group_by(StockDocument.type)
    )
    period_result = await db.execute(period_query)
    rows = period_result.all()

    received_quantity = Decimal("0")
    delivered_quantity = Decimal("0")
    transferred_in = Decimal("0")
    transferred_out = Decimal("0")
    adjustment_quantity = Decimal("0")
    operation_count = 0
    last_movement_at: datetime | None = None

    for row in rows:
        operation_count += int(row.op_count)
        if row.last_created_at:
            if last_movement_at is None or row.last_created_at > last_movement_at:
                last_movement_at = row.last_created_at

        if row.doc_type == "receipt":
            received_quantity += Decimal(str(row.total_qty or "0"))
        elif row.doc_type == "delivery":
            delivered_quantity += Decimal(str(row.total_qty or "0"))
        elif row.doc_type == "internal_transfer":
            transferred_in += Decimal(str(row.in_qty or "0"))
            transferred_out += Decimal(str(row.out_qty or "0"))
        elif row.doc_type == "adjustment":
            adjustment_quantity += Decimal(str(row.in_qty or "0")) - Decimal(str(row.out_qty or "0"))

    closing_quantity = opening_quantity + received_quantity - delivered_quantity + adjustment_quantity

    return ProductLedgerSummaryOut(
        product_id=product.id,
        sku=product.sku,
        name=product.name,
        period={
            "from": date_from.isoformat(),
            "to": date_to.isoformat(),
        },
        opening_quantity=opening_quantity,
        received_quantity=received_quantity,
        delivered_quantity=delivered_quantity,
        transferred_in=transferred_in,
        transferred_out=transferred_out,
        adjustment_quantity=adjustment_quantity,
        closing_quantity=closing_quantity,
        operation_count=operation_count,
        last_movement_at=last_movement_at.isoformat() if last_movement_at else None,
    )

