"""
app/features/operations/adjustments_router.py

Inventory Adjustments: physical count reconciliation with virtual adjustment account.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.features.operations import service
from app.features.operations.schemas import (
    AdjustmentCreate,
    DocumentOut,
    StockAdjustmentItemOut,
)
from app.models.models import User

router = APIRouter(prefix="/adjustments", tags=["adjustments"])

manager_or_admin = require_role("admin", "inventory_manager")


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def create_adjustment(
    payload: AdjustmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentOut:
    virtual_location_id = await service.get_virtual_adjustment_location_id(db)

    source_location_id, dest_location_id, resolved_lines = await service.build_adjustment_lines(
        db,
        internal_location_id=payload.internal_location_id,
        adjustment_lines=[line.model_dump() for line in payload.lines],
        virtual_adjustment_location_id=virtual_location_id,
    )

    target_warehouse_id = (
        current_user.warehouse_id
        if current_user.role == "warehouse_staff" and current_user.warehouse_id
        else payload.warehouse_id
    )

    document = await service.create_document(
        db,
        doc_type="adjustment",
        source_location_id=source_location_id,
        dest_location_id=dest_location_id,
        warehouse_id=target_warehouse_id,
        partner_id=None,
        notes=payload.notes,
        created_by=current_user.id,
        lines=resolved_lines,
    )

    # Role-based rule:
    # If the creator is a manager/admin and requested auto_validate, directly validate so it moves
    # straight to the 'done' (validated) section without staying in draft.
    # Staff adjustments ALWAYS remain in 'draft' and require separate manager/admin validation.
    if payload.auto_validate and current_user.role in ("admin", "inventory_manager"):
        document = await service.validate_document(db, document.id, current_user.id)

    return DocumentOut.model_validate(document)


@router.get("/stock-items", response_model=list[StockAdjustmentItemOut])
async def list_stock_items_for_adjustment(
    warehouse_id: uuid.UUID | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[StockAdjustmentItemOut]:
    """
    List all products with their location and warehouse for direct stock adjustments.
    """
    items = await service.list_adjustment_stock_items(
        db, warehouse_id=warehouse_id, search=search
    )
    return [StockAdjustmentItemOut(**item) for item in items]


@router.get("", response_model=list[DocumentOut])
async def list_adjustments(
    status: str | None = None,
    warehouse_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DocumentOut]:
    effective_warehouse_id = warehouse_id
    if current_user.role == "warehouse_staff" and current_user.warehouse_id:
        effective_warehouse_id = current_user.warehouse_id
    docs = await service.list_documents(db, doc_type="adjustment", status_filter=status, warehouse_id=effective_warehouse_id)
    return [DocumentOut.model_validate(d) for d in docs]


@router.get("/{document_id}", response_model=DocumentOut)
async def get_adjustment(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentOut:
    document = await service.get_document(db, document_id)
    if (
        current_user.role == "warehouse_staff"
        and current_user.warehouse_id
        and document.warehouse_id
        and document.warehouse_id != current_user.warehouse_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: you can only view adjustments for your assigned warehouse.",
        )
    return DocumentOut.model_validate(document)


@router.post("/{document_id}/validate", response_model=DocumentOut)
async def validate_adjustment(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(manager_or_admin),
) -> DocumentOut:
    """Adjustments require manager/admin approval by default."""
    document = await service.validate_document(db, document_id, current_user.id)
    return DocumentOut.model_validate(document)


@router.post("/{document_id}/cancel", response_model=DocumentOut)
async def cancel_adjustment(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> DocumentOut:
    document = await service.cancel_document(db, document_id)
    return DocumentOut.model_validate(document)
