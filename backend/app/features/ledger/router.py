"""
app/features/ledger/router.py

FastAPI router for Move History and Explain Stock audit timeline.
"""
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.features.ledger import service
from datetime import datetime

from app.features.ledger.schemas import ProductLedgerSummaryOut, StockTimelineOut
from app.features.operations.schemas import DocumentOut
from app.models.models import User

router = APIRouter(prefix="/ledger", tags=["ledger"])


@router.get("/move-history", response_model=list[DocumentOut])
async def move_history(
    document_type: str | None = None,
    status: str | None = None,
    warehouse_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[DocumentOut]:
    docs = await service.get_move_history(
        db,
        document_type=document_type,
        status_filter=status,
        warehouse_id=warehouse_id,
    )
    return [DocumentOut.model_validate(d) for d in docs]


@router.get("/products/{product_id}/summary", response_model=ProductLedgerSummaryOut)
async def product_ledger_summary(
    product_id: uuid.UUID,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ProductLedgerSummaryOut:
    return await service.get_product_ledger_summary(
        db,
        product_id=product_id,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/products/{product_id}/explain", response_model=StockTimelineOut)
async def explain_product_stock(
    product_id: uuid.UUID,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> StockTimelineOut:
    return await service.explain_product_stock(db, product_id, limit=limit)


@router.get("/{document_id}", response_model=DocumentOut)
async def get_ledger_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DocumentOut:
    doc = await service.get_ledger_document(db, document_id)
    return DocumentOut.model_validate(doc)

