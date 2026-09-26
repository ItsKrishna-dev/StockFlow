"""
tests/test_integrity.py

Verify the Stock Integrity Checker:
- Healthy database state evaluation
- Endpoints (/summary, /issues, /run)
- Detection of violated invariants (checks 1, 3, and 6)
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal
import pytest
import httpx
from sqlalchemy import delete

from app.core.database import AsyncSessionLocal
from app.models.models import (
    StockDocument,
    StockDocumentLine,
    StockLedger,
    User,
)


@pytest.mark.asyncio
async def test_integrity_endpoints(staff_client: httpx.AsyncClient):
    # 1. Summary GET
    res = await staff_client.get("/api/v1/integrity/summary")
    assert res.status_code == 200, res.text
    data = res.json()
    assert "status" in data
    assert data["checks_run"] == 8
    assert "integrity_score" in data
    assert isinstance(data["issues"], list)

    # 2. Run POST alias
    run_res = await staff_client.post("/api/v1/integrity/run")
    assert run_res.status_code == 200
    assert run_res.json()["checks_run"] == 8

    # 3. Issues GET with filter
    issues_res = await staff_client.get("/api/v1/integrity/issues?severity=high")
    assert issues_res.status_code == 200
    issues = issues_res.json()
    assert isinstance(issues, list)
    for iss in issues:
        assert iss["severity"] == "high"


@pytest.mark.asyncio
async def test_integrity_check_1_completed_document_without_ledger(
    staff_client: httpx.AsyncClient,
    seed_data: dict,
):
    """Check 1: Flag a document marked 'done' without any ledger entries."""
    unique = uuid.uuid4().hex[:6].upper()
    doc_num = f"CHK1-{unique}"
    doc_id = uuid.uuid4()
    loc_vendor = seed_data["loc_vendor"].id
    loc_main = seed_data["loc_main"].id
    wh_id = seed_data["warehouse"].id

    async with AsyncSessionLocal() as session:
        user = (await session.execute(User.__table__.select().limit(1))).first()
        user_id = user.id

        doc = StockDocument(
            id=doc_id,
            document_number=doc_num,
            type="receipt",
            status="done",
            source_location_id=loc_vendor,
            dest_location_id=loc_main,
            warehouse_id=wh_id,
            created_by=user_id,
            validated_by=user_id,
            validated_at=datetime.now(timezone.utc),
        )
        session.add(doc)
        await session.commit()

    try:
        res = await staff_client.get("/api/v1/integrity/summary")
        assert res.status_code == 200
        summary = res.json()
        assert summary["status"] == "critical"
        found = any(
            iss["check"] == "completed_documents_have_ledger_entries"
            and iss["document_number"] == doc_num
            for iss in summary["issues"]
        )
        assert found, f"Issue for document {doc_num} not detected in summary"
    finally:
        async with AsyncSessionLocal() as session:
            await session.execute(delete(StockDocument).where(StockDocument.id == doc_id))
            await session.commit()


@pytest.mark.asyncio
async def test_integrity_check_3_ledger_quantity_exceeds_line_expected(
    seed_data: dict,
):
    """Check 3: Flag stock_ledger entry whose quantity exceeds quantity_expected."""
    unique = uuid.uuid4().hex[:6].upper()
    doc_num = f"CHK3-{unique}"
    doc_id = uuid.uuid4()
    line_id = uuid.uuid4()
    ledger_id = uuid.uuid4()
    loc_vendor = seed_data["loc_vendor"].id
    loc_main = seed_data["loc_main"].id
    wh_id = seed_data["warehouse"].id
    uom_pcs = seed_data["uom_pcs"].id

    async with AsyncSessionLocal() as session:
        try:
            user = (await session.execute(User.__table__.select().limit(1))).first()
            user_id = user.id
            from app.models.models import Product
            prod_row = (await session.execute(Product.__table__.select().limit(1))).first()
            prod_id = prod_row.id

            doc = StockDocument(
                id=doc_id,
                document_number=doc_num,
                type="receipt",
                status="done",
                source_location_id=loc_vendor,
                dest_location_id=loc_main,
                warehouse_id=wh_id,
                created_by=user_id,
                validated_by=user_id,
                validated_at=datetime.now(timezone.utc),
            )
            session.add(doc)

            line = StockDocumentLine(
                id=line_id,
                document_id=doc_id,
                product_id=prod_id,
                uom_id=uom_pcs,
                quantity_expected=Decimal("10.0"),
                quantity_done=Decimal("10.0"),
            )
            session.add(line)
            await session.flush()

            # Ledger row with quantity 15 > line expected 10
            ledger = StockLedger(
                id=ledger_id,
                document_line_id=line_id,
                product_id=prod_id,
                source_location_id=loc_vendor,
                dest_location_id=loc_main,
                quantity=Decimal("15.0"),
                performed_by=user_id,
            )
            session.add(ledger)
            await session.flush()

            from app.features.integrity.service import check_ledger_quantity_matches_document_line, run_integrity_checks
            issues = await check_ledger_quantity_matches_document_line(session)
            found = any(
                iss["check"] == "ledger_quantity_matches_document_line"
                and iss["document_number"] == doc_num
                for iss in issues
            )
            assert found, f"Issue for document {doc_num} not detected in check"

            summary = await run_integrity_checks(session)
            assert any(
                iss["check"] == "ledger_quantity_matches_document_line"
                and iss["document_number"] == doc_num
                for iss in summary["issues"]
            )
        finally:
            await session.rollback()



@pytest.mark.asyncio
async def test_integrity_check_6_adjustments_have_reasons(
    staff_client: httpx.AsyncClient,
    seed_data: dict,
):
    """Check 6: Flag adjustment document lines missing a reason."""
    unique = uuid.uuid4().hex[:6].upper()
    doc_num = f"CHK6-{unique}"
    doc_id = uuid.uuid4()
    line_id = uuid.uuid4()
    loc_adj = seed_data["loc_adj"].id
    loc_main = seed_data["loc_main"].id
    wh_id = seed_data["warehouse"].id
    uom_pcs = seed_data["uom_pcs"].id

    async with AsyncSessionLocal() as session:
        user = (await session.execute(User.__table__.select().limit(1))).first()
        user_id = user.id
        from app.models.models import Product
        prod_row = (await session.execute(Product.__table__.select().limit(1))).first()
        prod_id = prod_row.id

        doc = StockDocument(
            id=doc_id,
            document_number=doc_num,
            type="adjustment",
            status="draft",
            source_location_id=loc_adj,
            dest_location_id=loc_main,
            warehouse_id=wh_id,
            created_by=user_id,
        )
        session.add(doc)

        line = StockDocumentLine(
            id=line_id,
            document_id=doc_id,
            product_id=prod_id,
            uom_id=uom_pcs,
            quantity_expected=Decimal("5.0"),
            quantity_done=Decimal("0.0"),
            reason=None,  # Missing reason!
        )
        session.add(line)
        await session.commit()

    try:
        res = await staff_client.get("/api/v1/integrity/summary")
        assert res.status_code == 200
        summary = res.json()
        found = any(
            iss["check"] == "adjustments_have_reasons"
            and iss["document_number"] == doc_num
            for iss in summary["issues"]
        )
        assert found, f"Missing reason on {doc_num} not detected in summary"
    finally:
        async with AsyncSessionLocal() as session:
            await session.execute(delete(StockDocumentLine).where(StockDocumentLine.id == line_id))
            await session.execute(delete(StockDocument).where(StockDocument.id == doc_id))
            await session.commit()
