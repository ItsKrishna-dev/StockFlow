"""
app/services/stock_service.py

The Stock Operations Engine. Every quantity change in StockSense — receipt,
delivery, internal transfer, adjustment — goes through this one module.
The pattern is always the same:

  1. Create a stock_document (+ lines) in status 'draft'.
  2. Optionally record partial quantity_done per line before validating.
  3. validate_document() inserts one stock_ledger row per line. The
     database trigger (fn_apply_ledger_to_quants) is the ONLY thing that
     ever mutates stock_quants — this service never updates stock_quants
     directly, so there is exactly one code path that can get stock math
     wrong, and it lives in schema.sql, guarded by DB-level constraints.

Anything that later reads "why did stock change" (explainable ledger,
integrity checker, predictive reorder, AI copilot) reads stock_ledger and
stock_documents produced here — nothing else writes to them.
"""
import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import (
    Location,
    Product,
    StockDocument,
    StockDocumentLine,
    StockLedger,
    StockQuant,
)

# --- Location-type contracts per document type -----------------------
# (source_type, dest_type) required for each operation. Enforced here so
# a bad request fails with a clear 400 instead of a cryptic DB error.
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
        raise HTTPException(status_code=404, detail=f"Location {location_id} not found")
    return loc_type


async def validate_location_types(
    db: AsyncSession, doc_type: str, source_location_id: uuid.UUID, dest_location_id: uuid.UUID
) -> None:
    expected_source, expected_dest = LOCATION_TYPE_RULES[doc_type]
    if expected_source == "*":
        return

    source_type = await _get_location_type(db, source_location_id)
    dest_type = await _get_location_type(db, dest_location_id)

    if source_type != expected_source or dest_type != expected_dest:
        raise HTTPException(
            status_code=400,
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
    quantity_expected must be > 0 for every line (DB constraint enforces this).
    """
    if source_location_id == dest_location_id:
        raise HTTPException(status_code=400, detail="Source and destination locations must differ")

    await validate_location_types(db, doc_type, source_location_id, dest_location_id)

    document = StockDocument(
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
    await db.flush()  # get document.id without committing yet

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
        raise HTTPException(status_code=404, detail="Document not found")
    return document


async def update_line_quantity(
    db: AsyncSession, document_id: uuid.UUID, line_id: uuid.UUID, quantity_done: Decimal, reason: str | None
) -> StockDocumentLine:
    document = await get_document(db, document_id)
    if document.status in ("done", "canceled"):
        raise HTTPException(status_code=400, detail=f"Cannot edit a '{document.status}' document")

    line = next((l for l in document.lines if l.id == line_id), None)
    if line is None:
        raise HTTPException(status_code=404, detail="Line not found on this document")

    if quantity_done > line.quantity_expected:
        raise HTTPException(status_code=400, detail="quantity_done cannot exceed quantity_expected")

    line.quantity_done = quantity_done
    if reason is not None:
        line.reason = reason

    await db.commit()
    await db.refresh(line)
    return line


async def validate_document(db: AsyncSession, document_id: uuid.UUID, validated_by: uuid.UUID) -> StockDocument:
    """
    Locks the document, writes one stock_ledger row per line (using
    quantity_done if set, otherwise falling back to quantity_expected —
    i.e. "validate as fully received/delivered/transferred"), and marks
    the document 'done'. The DB trigger handles all stock_quants math
    and raises if source stock is insufficient; we translate that into
    a clean 400 instead of a 500.
    """
    result = await db.execute(
        select(StockDocument)
        .options(selectinload(StockDocument.lines))
        .where(StockDocument.id == document_id)
        .with_for_update()
    )
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.status == "done":
        raise HTTPException(status_code=400, detail="Document is already validated")
    if document.status == "canceled":
        raise HTTPException(status_code=400, detail="Cannot validate a canceled document")

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
        from datetime import datetime, timezone
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
            status_code=400,
            detail="Cannot cancel a validated document; stock has already moved. Create a correcting adjustment instead.",
        )
    document.status = "canceled"
    await db.commit()
    return await get_document(db, document_id)


async def build_adjustment_lines(
    db: AsyncSession, internal_location_id: uuid.UUID, adjustment_lines: list[dict], virtual_adjustment_location_id: uuid.UUID
) -> tuple[uuid.UUID, uuid.UUID, list[dict]]:
    """
    Adjustments don't have a natural single (source, dest) pair the way
    receipts/deliveries/transfers do — a stock increase and a stock
    decrease move in opposite directions relative to the virtual
    adjustment location. Since one stock_document has exactly one
    source/dest pair, an adjustment batch containing both increases and
    decreases must be split into two documents by the caller. This
    helper computes the diff-based line list and tells the caller which
    direction this batch is (all increases or all decreases) — mixed
    batches raise a clear error so the caller can split them.
    """
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
        diff = Decimal(entry["counted_quantity"]) - current_qty

        if diff == 0:
            raise HTTPException(
                status_code=400,
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
            status_code=400,
            detail="Adjustment batch mixes increases and decreases; submit them as two separate adjustments",
        )

    direction = directions.pop()
    if direction == "increase":
        source_location_id, dest_location_id = virtual_adjustment_location_id, internal_location_id
    else:
        source_location_id, dest_location_id = internal_location_id, virtual_adjustment_location_id

    return source_location_id, dest_location_id, resolved_lines


async def get_product_ledger(db: AsyncSession, product_id: uuid.UUID, limit: int = 50) -> list[dict]:
    """Raw rows for the explainable stock timeline (used by app/api/v1/ledger.py)."""
    from app.models.models import User

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
