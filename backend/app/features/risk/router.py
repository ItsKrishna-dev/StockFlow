"""
app/features/risk/router.py

Endpoints for Inventory Risk Center diagnostic oversight.
"""
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.features.risk import service
from app.features.risk.schemas import RiskFindingOut
from app.models.models import User

router = APIRouter(prefix="/risk-center", tags=["risk-center"])


@router.get("", response_model=list[RiskFindingOut])
async def get_risk_findings(
    severity: Literal["informational", "low", "medium", "high"] | None = Query(default=None),
    product_id: uuid.UUID | None = Query(default=None),
    warehouse_id: uuid.UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[RiskFindingOut]:
    """Retrieve operational risk findings with optional severity, product, or warehouse filters."""
    return await service.run_risk_checks(
        db,
        severity=severity,
        product_id=product_id,
        warehouse_id=warehouse_id,
    )
