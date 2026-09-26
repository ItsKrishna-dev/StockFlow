"""
app/features/recommendations/router.py

Endpoints for explainable demand-based replenishment recommendations.
"""
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.features.recommendations import service
from app.features.recommendations.schemas import ReorderRecommendationOut
from app.models.models import User

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/reorder", response_model=list[ReorderRecommendationOut])
async def get_reorder_recommendations(
    warehouse_id: uuid.UUID | None = None,
    product_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ReorderRecommendationOut]:
    """Retrieve explainable replenishment recommendations with optional filters."""
    return await service.get_reorder_recommendations(
        db,
        warehouse_id=warehouse_id,
        product_id=product_id,
    )
