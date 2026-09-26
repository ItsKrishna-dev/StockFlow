"""
app/features/dashboard/router.py

FastAPI router for Dashboard metrics and Low-Stock notifications.
"""
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.features.dashboard import service
from app.features.dashboard.schemas import DashboardKPIs, LowStockItem
from app.models.models import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/kpis", response_model=DashboardKPIs)
async def get_kpis(
    warehouse_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardKPIs:
    effective_warehouse_id = warehouse_id
    if current_user.role == "warehouse_staff" and current_user.warehouse_id:
        effective_warehouse_id = current_user.warehouse_id
    return await service.get_kpis(db, warehouse_id=effective_warehouse_id)


@router.get("/low-stock", response_model=list[LowStockItem])
async def get_low_stock_items(
    warehouse_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[LowStockItem]:
    effective_warehouse_id = warehouse_id
    if current_user.role == "warehouse_staff" and current_user.warehouse_id:
        effective_warehouse_id = current_user.warehouse_id
    return await service.get_low_stock_items(db, warehouse_id=effective_warehouse_id)
