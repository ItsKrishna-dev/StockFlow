"""
app/api/v1/ledger.py
Move History screen + the "Explain Stock" timeline. Everything here is a
read-only projection over stock_ledger / stock_documents — nothing in this
file ever writes to the database.
"""
import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Product, StockDocument, StockDocumentLine, StockLedger, User
from app.schemas.document import DocumentOut, LedgerEntryOut, StockTimelineOut
from app.services import stock_service

router = APIRouter(prefix="/ledger", tags=["ledger"])


@router.get("/move-history", response_model=list[DocumentOut])
async def move_history(
    document_type: str | None = None,
    status: str | None = None,
    warehouse_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[DocumentOut]:
    query = select(StockDocument)
    if document_type:
        query = query.where(StockDocument.type == document_type)
    if status:
        query = query.where(StockDocument.status == status)
    if warehouse_id:
        query = query.where(StockDocument.warehouse_id == warehouse_id)

    result = await db.execute(query.order_by(StockDocument.created_at.desc()).limit(200))
    return [DocumentOut.model_validate(d) for d in result.scalars().all()]


@router.get("/products/{product_id}/explain", response_model=StockTimelineOut)
async def explain_product_stock(
    product_id: uuid.UUID, limit: int = 50, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
) -> StockTimelineOut:
    """
    Powers the "Explain Stock" button: opening balance + every validated
    movement since, in plain-language-ready form. The AI copilot will
    call this same function and simply phrase the result in a sentence —
    it never computes the numbers itself.
    """
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    rows = await stock_service.get_product_ledger(db, product_id, limit=limit)

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

    from app.models.models import StockQuant

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
