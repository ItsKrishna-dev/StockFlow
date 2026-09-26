"""
app/api/v1/warehouses.py
CRUD for warehouses, locations, and partners (vendors/customers).
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import Location, Partner, User, Warehouse
from app.schemas.warehouse import (
    LocationCreate,
    LocationOut,
    PartnerCreate,
    PartnerOut,
    WarehouseCreate,
    WarehouseOut,
)

router = APIRouter(tags=["warehouses"])

manager_or_admin = require_role("admin", "inventory_manager")


@router.post("/warehouses", response_model=WarehouseOut, status_code=201)
async def create_warehouse(
    payload: WarehouseCreate, db: AsyncSession = Depends(get_db), _: User = Depends(manager_or_admin)
) -> WarehouseOut:
    existing = await db.execute(select(Warehouse).where(Warehouse.code == payload.code))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail=f"Warehouse code '{payload.code}' already exists")

    warehouse = Warehouse(**payload.model_dump())
    db.add(warehouse)
    await db.commit()
    await db.refresh(warehouse)
    return WarehouseOut.model_validate(warehouse)


@router.get("/warehouses", response_model=list[WarehouseOut])
async def list_warehouses(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)) -> list[WarehouseOut]:
    result = await db.execute(select(Warehouse).where(Warehouse.is_active.is_(True)))
    return [WarehouseOut.model_validate(w) for w in result.scalars().all()]


@router.post("/locations", response_model=LocationOut, status_code=201)
async def create_location(
    payload: LocationCreate, db: AsyncSession = Depends(get_db), _: User = Depends(manager_or_admin)
) -> LocationOut:
    existing = await db.execute(select(Location).where(Location.code == payload.code))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail=f"Location code '{payload.code}' already exists")

    location = Location(**payload.model_dump())
    db.add(location)
    await db.commit()
    await db.refresh(location)
    return LocationOut.model_validate(location)


@router.get("/locations", response_model=list[LocationOut])
async def list_locations(
    warehouse_id: uuid.UUID | None = None,
    type: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[LocationOut]:
    query = select(Location).where(Location.is_active.is_(True))
    if warehouse_id:
        query = query.where(Location.warehouse_id == warehouse_id)
    if type:
        query = query.where(Location.type == type)

    result = await db.execute(query)
    return [LocationOut.model_validate(l) for l in result.scalars().all()]


@router.post("/partners", response_model=PartnerOut, status_code=201)
async def create_partner(
    payload: PartnerCreate, db: AsyncSession = Depends(get_db), _: User = Depends(manager_or_admin)
) -> PartnerOut:
    partner = Partner(**payload.model_dump())
    db.add(partner)
    await db.commit()
    await db.refresh(partner)
    return PartnerOut.model_validate(partner)


@router.get("/partners", response_model=list[PartnerOut])
async def list_partners(
    type: str | None = None, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
) -> list[PartnerOut]:
    query = select(Partner).where(Partner.is_active.is_(True))
    if type:
        query = query.where((Partner.type == type) | (Partner.type == "both"))
    result = await db.execute(query)
    return [PartnerOut.model_validate(p) for p in result.scalars().all()]
