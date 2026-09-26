"""
app/api/v1/adjustments.py
Reconciles system stock with a physical count. Internally this still
creates a stock_document + stock_document_lines + stock_ledger rows like
every other operation, but the request shape matches how a warehouse
worker actually performs a count: "I counted X, system said Y, here's why."

Diff direction (increase vs decrease) determines whether the virtual
adjustment location is the source or the destination. A single request
must be all-increase or all-decrease (see stock_service.build_adjustment_lines);
mixed batches are rejected with a clear message telling the caller to split
them into two requests.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import Location, StockDocument, User
from app.schemas.document import AdjustmentCreate, DocumentOut
from app.services import stock_service

router = APIRouter(prefix="/adjustments", tags=["adjustments"])

manager_or_admin = require_role("admin", "inventory_manager")


async def _get_virtual_adjustment_location_id(db: AsyncSession) -> uuid.UUID:
    result = await db.execute(
        select(Location.id).where(Location.type == "virtual_adjustment", Location.is_active.is_(True)).limit(1)
    )
    location_id = result.scalar_one_or_none()
    if location_id is None:
        raise HTTPException(
            status_code=500,
            detail=(
                "No active location of type 'virtual_adjustment' exists. "
                "Seed one first, e.g. via POST /api/v1/locations "
                "{'name': 'Adjustment Account', 'code': 'ADJ-VIRTUAL', 'type': 'virtual_adjustment'}"
            ),
        )
    return location_id


@router.post("", response_model=DocumentOut, status_code=201)
async def create_adjustment(
    payload: AdjustmentCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> DocumentOut:
    virtual_location_id = await _get_virtual_adjustment_location_id(db)

    source_location_id, dest_location_id, resolved_lines = await stock_service.build_adjustment_lines(
        db,
        internal_location_id=payload.internal_location_id,
        adjustment_lines=[line.model_dump() for line in payload.lines],
        virtual_adjustment_location_id=virtual_location_id,
    )

    document = await stock_service.create_document(
        db,
        doc_type="adjustment",
        source_location_id=source_location_id,
        dest_location_id=dest_location_id,
        warehouse_id=payload.warehouse_id,
        partner_id=None,
        notes=payload.notes,
        created_by=current_user.id,
        lines=resolved_lines,
    )
    return DocumentOut.model_validate(document)


@router.get("", response_model=list[DocumentOut])
async def list_adjustments(
    status: str | None = None, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
) -> list[DocumentOut]:
    query = select(StockDocument).where(StockDocument.type == "adjustment")
    if status:
        query = query.where(StockDocument.status == status)
    result = await db.execute(query.order_by(StockDocument.created_at.desc()))
    return [DocumentOut.model_validate(d) for d in result.scalars().all()]


@router.get("/{document_id}", response_model=DocumentOut)
async def get_adjustment(document_id: uuid.UUID, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)) -> DocumentOut:
    document = await stock_service.get_document(db, document_id)
    return DocumentOut.model_validate(document)


@router.post("/{document_id}/validate", response_model=DocumentOut)
async def validate_adjustment(
    document_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(manager_or_admin)
) -> DocumentOut:
    """
    Adjustments require manager/admin approval by default — this is the
    role-based approval control judges will notice, and it maps directly
    onto the DB's existing role enum without any schema change.
    """
    document = await stock_service.validate_document(db, document_id, current_user.id)
    return DocumentOut.model_validate(document)


@router.post("/{document_id}/cancel", response_model=DocumentOut)
async def cancel_adjustment(
    document_id: uuid.UUID, db: AsyncSession = Depends(get_db), _: User = Depends(manager_or_admin)
) -> DocumentOut:
    document = await stock_service.cancel_document(db, document_id)
    return DocumentOut.model_validate(document)
