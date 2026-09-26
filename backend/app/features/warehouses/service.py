"""
app/features/warehouses/service.py

Domain service logic for warehouses, storage locations, and business partners (vendors/customers).
"""
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.warehouses.schemas import (
    LocationCreate,
    LocationOut,
    PartnerCreate,
    PartnerOut,
    WarehouseCreate,
    WarehouseOut,
)
from app.models.models import Location, Partner, Warehouse


# --- Warehouse Service Functions ---
async def create_warehouse(payload: WarehouseCreate, db: AsyncSession) -> WarehouseOut:
    existing = await db.execute(select(Warehouse).where(Warehouse.code == payload.code))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Warehouse code '{payload.code}' already exists",
        )

    warehouse = Warehouse(**payload.model_dump())
    db.add(warehouse)
    await db.commit()
    await db.refresh(warehouse)
    return WarehouseOut.model_validate(warehouse)


async def list_warehouses(db: AsyncSession) -> list[WarehouseOut]:
    result = await db.execute(select(Warehouse).where(Warehouse.is_active.is_(True)))
    return [WarehouseOut.model_validate(w) for w in result.scalars().all()]


# --- Location Service Functions ---
async def create_location(payload: LocationCreate, db: AsyncSession) -> LocationOut:
    existing = await db.execute(select(Location).where(Location.code == payload.code))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Location code '{payload.code}' already exists",
        )

    location = Location(**payload.model_dump())
    db.add(location)
    await db.commit()
    await db.refresh(location)
    return LocationOut.model_validate(location)


async def list_locations(
    db: AsyncSession,
    warehouse_id: uuid.UUID | None = None,
    type: str | None = None,
) -> list[LocationOut]:
    query = select(Location).where(Location.is_active.is_(True))
    if warehouse_id:
        query = query.where(Location.warehouse_id == warehouse_id)
    if type:
        query = query.where(Location.type == type)

    result = await db.execute(query)
    return [LocationOut.model_validate(l) for l in result.scalars().all()]


# --- Partner Service Functions ---
async def create_partner(payload: PartnerCreate, db: AsyncSession) -> PartnerOut:
    partner = Partner(**payload.model_dump())
    db.add(partner)
    await db.commit()
    await db.refresh(partner)
    return PartnerOut.model_validate(partner)


async def list_partners(db: AsyncSession, type: str | None = None) -> list[PartnerOut]:
    query = select(Partner).where(Partner.is_active.is_(True))
    if type:
        query = query.where((Partner.type == type) | (Partner.type == "both"))
    result = await db.execute(query)
    return [PartnerOut.model_validate(p) for p in result.scalars().all()]
