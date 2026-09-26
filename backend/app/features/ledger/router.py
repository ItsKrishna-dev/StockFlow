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
from app.features.ledger.schemas import StockTimelineOut
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


@router.get("/products/{product_id}/explain", response_model=StockTimelineOut)
async def explain_product_stock(
    product_id: uuid.UUID,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> StockTimelineOut:
    return await service.explain_product_stock(db, product_id, limit=limit)
