"""
app/features/ledger/service.py

Audit and projection services over stock_ledger and stock_documents.
Read-only queries — nothing in this service writes to the database.
"""
import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.orm import selectinload

from app.features.ledger.schemas import LedgerEntryOut, StockTimelineOut
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
