"""
app/features/copilot/router.py

Endpoints for AI Inventory Copilot question answering.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.features.copilot import service
from app.features.copilot.schemas import CopilotAskIn, CopilotAskOut
from app.models.models import User

router = APIRouter(prefix="/copilot", tags=["copilot"])


@router.post("/ask", response_model=CopilotAskOut)
async def ask_copilot(
    payload: CopilotAskIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CopilotAskOut:
    """Natural language question interface over inventory metrics and operations."""
    return await service.ask_copilot(db, payload.question)
