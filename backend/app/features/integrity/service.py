"""
app/features/integrity/service.py

Read-only stock integrity verification services.
Purely diagnostic SELECT queries; never mutates database state.
"""
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import (
    Location,
    Product,
    StockDocument,
    StockDocumentLine,
    StockLedger,
    StockQuant,
)


async def check_completed_documents_have_ledger_entries(db: AsyncSession) -> list[dict]:
    """1. Every stock_documents row with status = 'done' must have at least one stock_ledger row."""
    result = await db.execute(
        select(StockDocument.id, StockDocument.document_number)
        .outerjoin(StockDocumentLine, StockDocumentLine.document_id == StockDocument.id)
        .outerjoin(StockLedger, StockLedger.document_line_id == StockDocumentLine.id)
        .where(StockDocument.status == "done")
        .group_by(StockDocument.id, StockDocument.document_number)
        .having(func.count(StockLedger.id) == 0)
    )
    issues: list[dict] = []
    for row in result:
        doc_num = row.document_number or str(row.id)
        issues.append({
            "severity": "high",
            "check": "completed_documents_have_ledger_entries",
            "message": f"Document {doc_num} is marked 'done' but has no stock ledger entries",
            "document_number": doc_num,
        })
    return issues


async def check_canceled_documents_have_no_ledger_entries(db: AsyncSession) -> list[dict]:
    """2. Any stock_documents row with status = 'canceled' must have zero stock_ledger rows."""
    result = await db.execute(
        select(
            StockDocument.id,
            StockDocument.document_number,
            func.count(StockLedger.id).label("cnt"),
        )
        .join(StockDocumentLine, StockDocumentLine.document_id == StockDocument.id)
        .join(StockLedger, StockLedger.document_line_id == StockDocumentLine.id)
        .where(StockDocument.status == "canceled")
        .group_by(StockDocument.id, StockDocument.document_number)
        .having(func.count(StockLedger.id) > 0)
    )
    issues: list[dict] = []
    for row in result:
        doc_num = row.document_number or str(row.id)
        issues.append({
            "severity": "high",
            "check": "canceled_documents_have_no_ledger_entries",
            "message": f"Document {doc_num} is canceled but has {row.cnt} attached ledger entries",
            "document_number": doc_num,
        })
    return issues


async def check_ledger_quantity_matches_document_line(db: AsyncSession) -> list[dict]:
    """3. For each stock_ledger row, quantity should not exceed quantity_expected of parent line."""
    result = await db.execute(
        select(
            StockLedger.id,
            StockDocument.document_number,
            StockLedger.quantity,
            StockDocumentLine.quantity_expected,
        )
        .join(StockDocumentLine, StockLedger.document_line_id == StockDocumentLine.id)
        .join(StockDocument, StockDocumentLine.document_id == StockDocument.id)
        .where(StockLedger.quantity > StockDocumentLine.quantity_expected)
    )
    issues: list[dict] = []
    for row in result:
        doc_num = row.document_number or str(row.id)
        issues.append({
            "severity": "medium",
            "check": "ledger_quantity_matches_document_line",
            "message": f"Ledger quantity ({row.quantity}) exceeds line expected quantity ({row.quantity_expected}) on document {doc_num}",
            "document_number": doc_num,
        })
    return issues


async def check_negative_or_invalid_quants(db: AsyncSession) -> list[dict]:
    """4. Any stock_quants row with quantity < 0 or reserved_qty > quantity."""
    result = await db.execute(
        select(
            Product.sku,
            Location.code.label("loc_code"),
            StockQuant.quantity,
            StockQuant.reserved_qty,
        )
        .join(Product, StockQuant.product_id == Product.id)
        .join(Location, StockQuant.location_id == Location.id)
        .where(
            (StockQuant.quantity < 0) | (StockQuant.reserved_qty > StockQuant.quantity)
        )
    )
    issues: list[dict] = []
    for row in result:
        issues.append({
            "severity": "high",
            "check": "negative_or_invalid_quants",
            "message": f"Invalid stock quant for {row.sku} at {row.loc_code}: quantity={row.quantity}, reserved={row.reserved_qty}",
            "document_number": row.sku,
        })
    return issues


async def check_quant_matches_ledger_derived_balance(db: AsyncSession) -> list[dict]:
    """5. Compare live stock_quants against expected balance summed from stock_ledger movements."""
    inward = (
        select(
            StockLedger.product_id,
            StockLedger.dest_location_id.label("location_id"),
            func.sum(StockLedger.quantity).label("in_qty"),
        )
        .group_by(StockLedger.product_id, StockLedger.dest_location_id)
        .subquery()
    )
    outward = (
        select(
            StockLedger.product_id,
            StockLedger.source_location_id.label("location_id"),
            func.sum(StockLedger.quantity).label("out_qty"),
        )
        .group_by(StockLedger.product_id, StockLedger.source_location_id)
        .subquery()
    )

    query = (
        select(
            StockQuant.quantity,
            Product.sku,
            Location.code.label("loc_code"),
            func.coalesce(inward.c.in_qty, Decimal("0")).label("in_qty"),
            func.coalesce(outward.c.out_qty, Decimal("0")).label("out_qty"),
        )
        .join(Product, StockQuant.product_id == Product.id)
        .join(Location, StockQuant.location_id == Location.id)
        .outerjoin(
            inward,
            (inward.c.product_id == StockQuant.product_id)
            & (inward.c.location_id == StockQuant.location_id),
        )
        .outerjoin(
            outward,
            (outward.c.product_id == StockQuant.product_id)
            & (outward.c.location_id == StockQuant.location_id),
        )
        .where(Location.type == "internal")
    )
    result = await db.execute(query)

    issues: list[dict] = []
    for row in result:
        derived_balance = Decimal(str(row.in_qty)) - Decimal(str(row.out_qty))
        live_quant = Decimal(str(row.quantity))
        if abs(derived_balance - live_quant) > Decimal("0.001"):
            issues.append({
                "severity": "high",
                "check": "quant_matches_ledger_derived_balance",
                "message": (
                    f"Quant drift for {row.sku} at {row.loc_code}: "
                    f"live quant={live_quant}, derived balance={derived_balance}"
                ),
                "document_number": row.sku,
            })
    return issues


async def check_adjustments_have_reasons(db: AsyncSession) -> list[dict]:
    """6. Every stock_document_lines row for adjustment documents must have a non-null, non-empty reason."""
    result = await db.execute(
        select(StockDocumentLine.id, StockDocument.document_number)
        .join(StockDocument, StockDocumentLine.document_id == StockDocument.id)
        .where(
            StockDocument.type == "adjustment",
            (StockDocumentLine.reason.is_(None)) | (func.trim(StockDocumentLine.reason) == ""),
        )
    )
    issues: list[dict] = []
    for row in result:
        doc_num = row.document_number or str(row.id)
        issues.append({
            "severity": "medium",
            "check": "adjustments_have_reasons",
            "message": f"Adjustment document {doc_num} line is missing required reason",
            "document_number": doc_num,
        })
    return issues


async def check_done_documents_have_validation_metadata(db: AsyncSession) -> list[dict]:
    """7. Any status = 'done' document must have non-null validated_by and validated_at."""
    result = await db.execute(
        select(StockDocument.id, StockDocument.document_number)
        .where(
            StockDocument.status == "done",
            (StockDocument.validated_by.is_(None)) | (StockDocument.validated_at.is_(None)),
        )
    )
    issues: list[dict] = []
    for row in result:
        doc_num = row.document_number or str(row.id)
        issues.append({
            "severity": "high",
            "check": "done_documents_have_validation_metadata",
            "message": f"Done document {doc_num} missing validated_by or validated_at metadata",
            "document_number": doc_num,
        })
    return issues


async def check_duplicate_ledger_movements(db: AsyncSession) -> list[dict]:
    """8. Verify no document_line_id appears more than once in stock_ledger."""
    result = await db.execute(
        select(StockLedger.document_line_id, func.count(StockLedger.id).label("cnt"))
        .where(StockLedger.document_line_id.is_not(None))
        .group_by(StockLedger.document_line_id)
        .having(func.count(StockLedger.id) > 1)
    )
    issues: list[dict] = []
    for row in result:
        issues.append({
            "severity": "high",
            "check": "duplicate_ledger_movements",
            "message": f"Document line {row.document_line_id} has {row.cnt} duplicate ledger entries",
            "document_number": str(row.document_line_id),
        })
    return issues


async def run_integrity_checks(db: AsyncSession) -> dict:
    """Aggregates all 8 integrity checks and calculates system health status and score."""
    checks = [
        check_completed_documents_have_ledger_entries,
        check_canceled_documents_have_no_ledger_entries,
        check_ledger_quantity_matches_document_line,
        check_negative_or_invalid_quants,
        check_quant_matches_ledger_derived_balance,
        check_adjustments_have_reasons,
        check_done_documents_have_validation_metadata,
        check_duplicate_ledger_movements,
    ]

    all_issues: list[dict] = []
    for check_fn in checks:
        issues = await check_fn(db)
        all_issues.extend(issues)

    checks_run = len(checks)
    issues_found = len(all_issues)
    has_high = any(issue["severity"] == "high" for issue in all_issues)

    if has_high:
        status_val = "critical"
    elif issues_found > 0:
        status_val = "warning"
    else:
        status_val = "healthy"

    integrity_score = round(max(0.0, 100.0 * (checks_run - issues_found) / checks_run), 1)

    return {
        "status": status_val,
        "integrity_score": integrity_score,
        "checks_run": checks_run,
        "issues_found": issues_found,
        "issues": all_issues,
    }
