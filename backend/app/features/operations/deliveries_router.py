"""
app/features/operations/deliveries_router.py

Outgoing stock operations: internal location -> customer location.
"""
import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.features.operations import service
from app.features.operations.schemas import DeliveryCreate, DocumentOut, LineUpdate
from app.models.models import User

router = APIRouter(prefix="/deliveries", tags=["deliveries"])

manager_or_admin = require_role("admin", "inventory_manager")


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def create_delivery(
    payload: DeliveryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentOut:
    document = await service.create_document(
        db,
        doc_type="delivery",
        source_location_id=payload.internal_location_id,
        dest_location_id=payload.customer_location_id,
        warehouse_id=payload.warehouse_id,
        partner_id=payload.partner_id,
        notes=payload.notes,
        created_by=current_user.id,
        lines=[line.model_dump() for line in payload.lines],
    )
    return DocumentOut.model_validate(document)


@router.get("", response_model=list[DocumentOut])
async def list_deliveries(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[DocumentOut]:
    docs = await service.list_documents(db, doc_type="delivery", status_filter=status)
    return [DocumentOut.model_validate(d) for d in docs]


@router.get("/{document_id}", response_model=DocumentOut)
async def get_delivery(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DocumentOut:
    document = await service.get_document(db, document_id)
    return DocumentOut.model_validate(document)


@router.patch("/{document_id}/lines/{line_id}")
async def update_delivery_line(
    document_id: uuid.UUID,
    line_id: uuid.UUID,
    payload: LineUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    line = await service.update_line_quantity(
        db,
        document_id,
        line_id,
        payload.quantity_done,
        payload.reason,
    )
    return {"id": line.id, "quantity_done": line.quantity_done, "reason": line.reason}


@router.post("/{document_id}/validate", response_model=DocumentOut)
async def validate_delivery(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(manager_or_admin),
) -> DocumentOut:
    document = await service.validate_document(db, document_id, current_user.id)
    return DocumentOut.model_validate(document)


@router.post("/{document_id}/cancel", response_model=DocumentOut)
async def cancel_delivery(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> DocumentOut:
    document = await service.cancel_document(db, document_id)
    return DocumentOut.model_validate(document)
