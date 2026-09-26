"""
app/features/warehouses/router.py

FastAPI router for warehouses, locations, and partners.
"""
import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.features.warehouses import service
from app.features.warehouses.schemas import (
    LocationCreate,
    LocationOut,
    PartnerCreate,
    PartnerOut,
    WarehouseCreate,
    WarehouseOut,
)
from app.models.models import User

router = APIRouter(tags=["warehouses"])

manager_or_admin = require_role("admin", "inventory_manager")


# --- Warehouses ---
@router.post("/warehouses", response_model=WarehouseOut, status_code=status.HTTP_201_CREATED)
async def create_warehouse(
    payload: WarehouseCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> WarehouseOut:
    return await service.create_warehouse(payload, db)


@router.get("/warehouses", response_model=list[WarehouseOut])
async def list_warehouses(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[WarehouseOut]:
    return await service.list_warehouses(db)


# --- Locations ---
@router.post("/locations", response_model=LocationOut, status_code=status.HTTP_201_CREATED)
async def create_location(
    payload: LocationCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> LocationOut:
    return await service.create_location(payload, db)


@router.get("/locations", response_model=list[LocationOut])
async def list_locations(
    warehouse_id: uuid.UUID | None = None,
    type: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[LocationOut]:
    return await service.list_locations(db, warehouse_id=warehouse_id, type=type)


# --- Partners ---
@router.post("/partners", response_model=PartnerOut, status_code=status.HTTP_201_CREATED)
async def create_partner(
    payload: PartnerCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> PartnerOut:
    return await service.create_partner(payload, db)


@router.get("/partners", response_model=list[PartnerOut])
async def list_partners(
    type: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[PartnerOut]:
    return await service.list_partners(db, type=type)
