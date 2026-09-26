"""
app/features/operations/router.py

Aggregated router for operations feature slice.
Exposes receipts, deliveries, transfers, and adjustments routers.
"""
from fastapi import APIRouter

from app.features.operations.adjustments_router import router as adjustments_router
from app.features.operations.deliveries_router import router as deliveries_router
from app.features.operations.receipts_router import router as receipts_router
from app.features.operations.transfers_router import router as transfers_router

router = APIRouter()
router.include_router(receipts_router)
router.include_router(deliveries_router)
router.include_router(transfers_router)
router.include_router(adjustments_router)

__all__ = [
    "router",
    "receipts_router",
    "deliveries_router",
    "transfers_router",
    "adjustments_router",
]
