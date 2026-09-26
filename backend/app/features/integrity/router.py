"""
app/features/integrity/router.py

Diagnostic endpoints for stock integrity and data drift verification.
"""
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.features.integrity import service
from app.features.integrity.schemas import IntegrityIssue, IntegritySummary
from app.models.models import User

router = APIRouter(prefix="/integrity", tags=["integrity"])


@router.get("/summary", response_model=IntegritySummary)
async def get_integrity_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> IntegritySummary:
    """Run all 8 integrity checks and return health summary and score."""
    summary_data = await service.run_integrity_checks(db)
    return IntegritySummary.model_validate(summary_data)


@router.post("/run", response_model=IntegritySummary)
async def run_integrity_checks_now(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> IntegritySummary:
    """Explicit run-now action alias for UI triggers."""
    summary_data = await service.run_integrity_checks(db)
    return IntegritySummary.model_validate(summary_data)


@router.get("/issues", response_model=list[IntegrityIssue])
async def get_integrity_issues(
    severity: Literal["high", "medium", "low"] | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[IntegrityIssue]:
    """Retrieve individual integrity issues with optional severity filter."""
    summary_data = await service.run_integrity_checks(db)
    issues = summary_data["issues"]
    if severity:
        issues = [iss for iss in issues if iss["severity"] == severity]
    return [IntegrityIssue.model_validate(iss) for iss in issues]
