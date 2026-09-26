"""
app/api/v1/transfers.py
Internal movement: internal location -> internal location. Total company
stock is unchanged; only the location breakdown shifts.
"""
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import StockDocument, User
from app.schemas.document import DocumentOut, LineUpdate, TransferCreate
from app.services import stock_service

router = APIRouter(prefix="/transfers", tags=["transfers"])

manager_or_admin = require_role("admin", "inventory_manager")


@router.post("", response_model=DocumentOut, status_code=201)
async def create_transfer(
    payload: TransferCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> DocumentOut:
    document = await stock_service.create_document(
        db,
        doc_type="internal_transfer",
        source_location_id=payload.source_location_id,
        dest_location_id=payload.dest_location_id,
        warehouse_id=payload.warehouse_id,
        partner_id=None,
        notes=payload.notes,
        created_by=current_user.id,
        lines=[line.model_dump() for line in payload.lines],
    )
    return DocumentOut.model_validate(document)


@router.get("", response_model=list[DocumentOut])
async def list_transfers(
    status: str | None = None, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
) -> list[DocumentOut]:
    query = select(StockDocument).where(StockDocument.type == "internal_transfer")
    if status:
        query = query.where(StockDocument.status == status)
    result = await db.execute(query.order_by(StockDocument.created_at.desc()))
    return [DocumentOut.model_validate(d) for d in result.scalars().all()]


@router.get("/{document_id}", response_model=DocumentOut)
async def get_transfer(document_id: uuid.UUID, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)) -> DocumentOut:
    document = await stock_service.get_document(db, document_id)
    return DocumentOut.model_validate(document)


@router.patch("/{document_id}/lines/{line_id}")
async def update_transfer_line(
    document_id: uuid.UUID,
    line_id: uuid.UUID,
    payload: LineUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    line = await stock_service.update_line_quantity(db, document_id, line_id, payload.quantity_done, payload.reason)
    return {"id": line.id, "quantity_done": line.quantity_done, "reason": line.reason}


@router.post("/{document_id}/validate", response_model=DocumentOut)
async def validate_transfer(
    document_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(manager_or_admin)
) -> DocumentOut:
    document = await stock_service.validate_document(db, document_id, current_user.id)
    return DocumentOut.model_validate(document)


@router.post("/{document_id}/cancel", response_model=DocumentOut)
async def cancel_transfer(
    document_id: uuid.UUID, db: AsyncSession = Depends(get_db), _: User = Depends(manager_or_admin)
) -> DocumentOut:
    document = await stock_service.cancel_document(db, document_id)
    return DocumentOut.model_validate(document)
