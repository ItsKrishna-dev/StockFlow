"""
app/features/dashboard/router.py

FastAPI router for Dashboard metrics and Low-Stock notifications.
"""
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
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DashboardKPIs:
    return await service.get_kpis(db)


@router.get("/low-stock", response_model=list[LowStockItem])
async def get_low_stock_items(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[LowStockItem]:
    return await service.get_low_stock_items(db)
