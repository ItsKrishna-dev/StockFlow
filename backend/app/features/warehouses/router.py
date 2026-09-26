"""
app/features/warehouses/router.py

FastAPI router for warehouses, locations, partners, and warehouse staff management.
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
    LocationStockItemOut,
    PartnerCreate,
    PartnerOut,
    StaffCreate,
    StaffOut,
    WarehouseCreate,
    WarehouseOut,
    WarehouseUpdate,
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


@router.put("/warehouses/{warehouse_id}", response_model=WarehouseOut)
async def update_warehouse(
    warehouse_id: uuid.UUID,
    payload: WarehouseUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> WarehouseOut:
    return await service.update_warehouse(warehouse_id, payload, db)


# --- Warehouse Staff Management ---
@router.post(
    "/warehouses/{warehouse_id}/staff",
    response_model=StaffOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_warehouse_staff(
    warehouse_id: uuid.UUID,
    payload: StaffCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> StaffOut:
    """
    Registers a staff member for the warehouse and dispatches real-time credentials email.
    """
    return await service.add_warehouse_staff(warehouse_id, payload, db)


@router.get("/warehouses/{warehouse_id}/staff", response_model=list[StaffOut])
async def list_staff_by_warehouse(
    warehouse_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[StaffOut]:
    return await service.list_warehouse_staff(db, warehouse_id=warehouse_id)


@router.get("/staff", response_model=list[StaffOut])
async def list_all_staff(
    warehouse_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[StaffOut]:
    """
    Lists staff across all warehouses or filtered by warehouse_id.
    """
    return await service.list_warehouse_staff(db, warehouse_id=warehouse_id)


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


@router.get("/locations/{location_id}/stock", response_model=list[LocationStockItemOut])
async def get_location_stock(
    location_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[LocationStockItemOut]:
    """Retrieve available products and quantities directly from DB for a given location."""
    return await service.list_location_stock(db, location_id=location_id)


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
