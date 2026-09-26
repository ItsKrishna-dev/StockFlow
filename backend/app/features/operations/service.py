"""
app/features/operations/service.py

The Stock Operations Engine: Receipts, Deliveries, Internal Transfers, and Adjustments.
All inventory quantity mutations are processed through validated documents and stock ledger
entries, which activate the PostgreSQL trigger (fn_apply_ledger_to_quants).
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import (
    Location,
    StockDocument,
    StockDocumentLine,
    StockLedger,
    StockQuant,
    Warehouse,
)

# --- Location-type contracts per document type ---
LOCATION_TYPE_RULES: dict[str, tuple[str, str]] = {
    "receipt": ("vendor", "internal"),
    "delivery": ("internal", "customer"),
    "internal_transfer": ("internal", "internal"),
    "adjustment": ("*", "*"),  # validated separately (either direction, via virtual_adjustment)
}


class InsufficientStockError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


async def _get_location_type(db: AsyncSession, location_id: uuid.UUID) -> str:
    result = await db.execute(select(Location.type).where(Location.id == location_id))
    loc_type = result.scalar_one_or_none()
    if loc_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {location_id} not found",
        )
    return loc_type


async def validate_location_types(
    db: AsyncSession,
    doc_type: str,
    source_location_id: uuid.UUID,
    dest_location_id: uuid.UUID,
) -> None:
    expected_source, expected_dest = LOCATION_TYPE_RULES.get(doc_type, ("*", "*"))
    if expected_source == "*":
        return

    source_type = await _get_location_type(db, source_location_id)
    dest_type = await _get_location_type(db, dest_location_id)

    if source_type != expected_source or dest_type != expected_dest:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"{doc_type} requires source type '{expected_source}' and "
                f"dest type '{expected_dest}', got '{source_type}' and '{dest_type}'"
            ),
        )


async def create_document(
    db: AsyncSession,
    *,
    doc_type: str,
    source_location_id: uuid.UUID,
    dest_location_id: uuid.UUID,
    warehouse_id: uuid.UUID | None,
    partner_id: uuid.UUID | None,
    notes: str | None,
    created_by: uuid.UUID,
    lines: list[dict],
) -> StockDocument:
    """
    lines: list of {product_id, uom_id, quantity_expected, reason(optional)}
    """
    if source_location_id == dest_location_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source and destination locations must differ",
        )

    await validate_location_types(db, doc_type, source_location_id, dest_location_id)

    # Auto-generate document_number per wireframe: <Warehouse>/<Operation>/<ID>
    wh_code = "WH"
    if warehouse_id:
        wh_row = await db.get(Warehouse, warehouse_id)
        if wh_row and wh_row.code:
            wh_code = wh_row.code.split("-")[0] if "-" in wh_row.code else wh_row.code

    op_map = {"receipt": "IN", "delivery": "OUT", "internal_transfer": "INT", "adjustment": "ADJ"}
    op_code = op_map.get(doc_type, "DOC")

    count_res = await db.execute(select(func.count(StockDocument.id)).where(StockDocument.type == doc_type))
    next_seq = (count_res.scalar() or 0) + 1
    doc_number = f"{wh_code}/{op_code}/{str(next_seq).zfill(4)}"

    document = StockDocument(
        document_number=doc_number,
        type=doc_type,
        status="draft",
        partner_id=partner_id,
        source_location_id=source_location_id,
        dest_location_id=dest_location_id,
        warehouse_id=warehouse_id,
        notes=notes,
        created_by=created_by,
    )
    db.add(document)
    await db.flush()

    for line in lines:
        db.add(
            StockDocumentLine(
                document_id=document.id,
                product_id=line["product_id"],
                uom_id=line["uom_id"],
                quantity_expected=line["quantity_expected"],
                quantity_done=Decimal("0"),
                reason=line.get("reason"),
            )
        )

    await db.commit()
    return await get_document(db, document.id)


async def get_document(db: AsyncSession, document_id: uuid.UUID) -> StockDocument:
    result = await db.execute(
        select(StockDocument)
        .options(selectinload(StockDocument.lines))
        .where(StockDocument.id == document_id)
    )
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


async def list_documents(
    db: AsyncSession,
    doc_type: str,
    status_filter: str | None = None,
    warehouse_id: uuid.UUID | None = None,
) -> list[StockDocument]:
    query = select(StockDocument).options(selectinload(StockDocument.lines)).where(StockDocument.type == doc_type)
    if status_filter:
        query = query.where(StockDocument.status == status_filter)
    if warehouse_id:
        query = query.where(StockDocument.warehouse_id == warehouse_id)
    result = await db.execute(query.order_by(StockDocument.created_at.desc()))
    return list(result.scalars().all())


async def mark_document_ready(db: AsyncSession, document_id: uuid.UUID) -> StockDocument:
    document = await get_document(db, document_id)
    if document.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot mark document in '{document.status}' status as ready",
        )
    document.status = "ready"
    await db.commit()
    return await get_document(db, document_id)


async def update_line_quantity(
    db: AsyncSession,
    document_id: uuid.UUID,
    line_id: uuid.UUID,
    quantity_done: Decimal,
    reason: str | None,
) -> StockDocumentLine:
    document = await get_document(db, document_id)
    if document.status in ("done", "canceled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot edit a '{document.status}' document",
        )

    line = next((l for l in document.lines if l.id == line_id), None)
    if line is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Line not found on this document",
        )

    if quantity_done > line.quantity_expected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="quantity_done cannot exceed quantity_expected",
        )

    line.quantity_done = quantity_done
    if reason is not None:
        line.reason = reason

    await db.commit()
    await db.refresh(line)
    return line


async def validate_document(
    db: AsyncSession,
    document_id: uuid.UUID,
    validated_by: uuid.UUID,
) -> StockDocument:
    """
    Locks the document, writes one stock_ledger row per line, and sets status to 'done'.
    Triggers execute ledger-to-quants update and raise error on insufficient stock.
    """
    result = await db.execute(
        select(StockDocument)
        .options(selectinload(StockDocument.lines))
        .where(StockDocument.id == document_id)
        .with_for_update()
    )
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if document.status == "done":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document is already validated")
    if document.status == "canceled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot validate a canceled document")

    try:
        for line in document.lines:
            movement_qty = line.quantity_done if line.quantity_done > 0 else line.quantity_expected

            db.add(
                StockLedger(
                    document_line_id=line.id,
                    product_id=line.product_id,
                    source_location_id=document.source_location_id,
                    dest_location_id=document.dest_location_id,
                    quantity=movement_qty,
                    performed_by=validated_by,
                )
            )
            line.quantity_done = movement_qty

        document.status = "done"
        document.validated_by = validated_by
        document.validated_at = datetime.now(timezone.utc)

        await db.commit()
    except DBAPIError as exc:
        await db.rollback()
        original_message = str(getattr(exc, "orig", exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Validation failed: {original_message}",
        ) from exc

    return await get_document(db, document_id)


async def cancel_document(db: AsyncSession, document_id: uuid.UUID) -> StockDocument:
    document = await get_document(db, document_id)
    if document.status == "done":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel a validated document; stock has already moved. Create a correcting adjustment instead.",
        )
    document.status = "canceled"
    await db.commit()
    return await get_document(db, document_id)


async def get_virtual_adjustment_location_id(db: AsyncSession) -> uuid.UUID:
    result = await db.execute(
        select(Location.id).where(Location.type == "virtual_adjustment", Location.is_active.is_(True)).limit(1)
    )
    location_id = result.scalar_one_or_none()
    if location_id is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "No active location of type 'virtual_adjustment' exists. "
                "Seed one first, e.g. via POST /api/v1/locations "
                "{'name': 'Adjustment Account', 'code': 'ADJ-VIRTUAL', 'type': 'virtual_adjustment'}"
            ),
        )
    return location_id


async def build_adjustment_lines(
    db: AsyncSession,
    internal_location_id: uuid.UUID,
    adjustment_lines: list[dict],
    virtual_adjustment_location_id: uuid.UUID,
) -> tuple[uuid.UUID, uuid.UUID, list[dict]]:
    resolved_lines: list[dict] = []
    directions: set[str] = set()

    for entry in adjustment_lines:
        result = await db.execute(
            select(StockQuant.quantity).where(
                StockQuant.product_id == entry["product_id"],
                StockQuant.location_id == internal_location_id,
            )
        )
        current_qty = result.scalar_one_or_none() or Decimal("0")
        diff = Decimal(str(entry["counted_quantity"])) - current_qty

        if diff == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product {entry['product_id']}: counted quantity matches system stock, nothing to adjust",
            )

        directions.add("increase" if diff > 0 else "decrease")
        resolved_lines.append(
            {
                "product_id": entry["product_id"],
                "uom_id": entry["uom_id"],
                "quantity_expected": abs(diff),
                "reason": f"{entry['reason']} (expected {current_qty}, counted {entry['counted_quantity']})",
            }
        )

    if len(directions) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Adjustment batch mixes increases and decreases; submit them as two separate adjustments",
        )

    direction = directions.pop()
    if direction == "increase":
        source_location_id, dest_location_id = virtual_adjustment_location_id, internal_location_id
    else:
        source_location_id, dest_location_id = internal_location_id, virtual_adjustment_location_id

    return source_location_id, dest_location_id, resolved_lines
