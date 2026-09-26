"""
app/features/warehouses/service.py

Domain service logic for warehouses, storage locations, business partners, and warehouse staff management.
"""
import uuid
import re

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.core.email import send_staff_credentials_email
from app.features.warehouses.schemas import (
    LocationCreate,
    LocationOut,
    PartnerCreate,
    PartnerOut,
    StaffCreate,
    StaffOut,
    WarehouseCreate,
    WarehouseOut,
    WarehouseUpdate,
)
from app.models.models import Location, Partner, User, Warehouse


# --- Warehouse Service Functions ---
async def create_warehouse(payload: WarehouseCreate, db: AsyncSession) -> WarehouseOut:
    clean_code = payload.code.strip().upper()
    existing = await db.execute(select(Warehouse).where(Warehouse.code == clean_code))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Warehouse code '{clean_code}' already exists",
        )

    dump_data = payload.model_dump(exclude={"location_names"})
    dump_data["code"] = clean_code
    warehouse = Warehouse(**dump_data)
    db.add(warehouse)
    await db.flush()

    # Automatically create user-specified locations if provided
    if payload.location_names:
        used_codes: set[str] = set()
        for idx, loc_name in enumerate(payload.location_names, 1):
            trimmed_name = loc_name.strip()
            if not trimmed_name:
                continue

            # Clean alphanumeric slug from name
            safe_slug = re.sub(r'[^A-Za-z0-9]', '', trimmed_name).upper()
            slug_part = safe_slug[:10] if safe_slug else "STOCK"
            
            # Format: e.g. KYN-01/L1-STOCK (always unique per index idx, max 30 chars)
            wh_prefix = clean_code[:12]
            loc_code = f"{wh_prefix}/L{idx}-{slug_part}"[:29]

            counter = 1
            while loc_code in used_codes:
                loc_code = f"{wh_prefix}/L{idx}-{slug_part[:6]}-{counter}"[:29]
                counter += 1

            # Verify against database for cross-warehouse collisions
            code_check = await db.execute(select(Location).where(Location.code == loc_code))
            while code_check.scalar_one_or_none() is not None:
                loc_code = f"{wh_prefix}/L{idx}-{uuid.uuid4().hex[:4].upper()}"[:29]
                code_check = await db.execute(select(Location).where(Location.code == loc_code))

            used_codes.add(loc_code)

            location = Location(
                name=trimmed_name,
                code=loc_code,
                type="internal",
                warehouse_id=warehouse.id,
            )
            db.add(location)


    await db.commit()
    await db.refresh(warehouse)
    return WarehouseOut.model_validate(warehouse)


async def update_warehouse(
    warehouse_id: uuid.UUID,
    payload: WarehouseUpdate,
    db: AsyncSession,
) -> WarehouseOut:
    result = await db.execute(select(Warehouse).where(Warehouse.id == warehouse_id))
    warehouse = result.scalar_one_or_none()
    if warehouse is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Warehouse not found",
        )

    if payload.code:
        clean_code = payload.code.strip().upper()
        if clean_code != warehouse.code:
            existing = await db.execute(
                select(Warehouse).where(Warehouse.code == clean_code, Warehouse.id != warehouse_id)
            )
            if existing.scalar_one_or_none() is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Warehouse code '{clean_code}' already in use by another warehouse",
                )
            warehouse.code = clean_code

    if payload.name is not None:
        warehouse.name = payload.name.strip()
    if payload.address is not None:
        warehouse.address = payload.address.strip() if payload.address else None
    if payload.is_active is not None:
        warehouse.is_active = payload.is_active

    await db.commit()
    await db.refresh(warehouse)
    return WarehouseOut.model_validate(warehouse)


async def list_warehouses(db: AsyncSession) -> list[WarehouseOut]:
    result = await db.execute(select(Warehouse).where(Warehouse.is_active.is_(True)).order_by(Warehouse.name))
    return [WarehouseOut.model_validate(w) for w in result.scalars().all()]


# --- Staff Management for Warehouses ---
async def add_warehouse_staff(
    warehouse_id: uuid.UUID,
    payload: StaffCreate,
    db: AsyncSession,
) -> StaffOut:
    # 1. Verify warehouse exists
    wh_res = await db.execute(select(Warehouse).where(Warehouse.id == warehouse_id))
    warehouse = wh_res.scalar_one_or_none()
    if warehouse is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Warehouse not found",
        )

    clean_email = str(payload.email).strip().lower()

    # 2. Check if email already registered
    existing_user = await db.execute(select(User).where(User.email == clean_email))
    if existing_user.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A user with email '{clean_email}' already exists",
        )

    # 3. Determine and check login_id
    login_id = payload.login_id.strip() if payload.login_id else None
    if not login_id:
        base_login = re.sub(r'[^a-zA-Z0-9]', '', clean_email.split('@')[0])[:12]
        login_id = base_login if len(base_login) >= 6 else f"{base_login}{uuid.uuid4().hex[:4]}"

    login_check = await db.execute(select(User).where(User.login_id == login_id))
    if login_check.scalar_one_or_none() is not None:
        login_id = f"{login_id[:8]}_{uuid.uuid4().hex[:4]}"

    # 4. Hash password and persist user
    hashed = hash_password(payload.password)
    user = User(
        email=clean_email,
        login_id=login_id,
        password_hash=hashed,
        full_name=payload.full_name.strip(),
        role="warehouse_staff",
        warehouse_id=warehouse.id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # 5. Dispatch onboarding credentials email via SMTP in real time
    await send_staff_credentials_email(
        to_email=clean_email,
        staff_name=user.full_name,
        warehouse_name=warehouse.name,
        password=payload.password,
        login_id=login_id,
    )

    return StaffOut(
        id=user.id,
        email=user.email,
        login_id=user.login_id,
        full_name=user.full_name,
        role=user.role,
        warehouse_id=user.warehouse_id,
        warehouse_name=warehouse.name,
        is_active=user.is_active,
        created_at=user.created_at,
    )


async def list_warehouse_staff(
    db: AsyncSession,
    warehouse_id: uuid.UUID | None = None,
) -> list[StaffOut]:
    query = select(User, Warehouse.name.label("warehouse_name")).outerjoin(
        Warehouse, User.warehouse_id == Warehouse.id
    ).where(User.is_active.is_(True))

    if warehouse_id:
        query = query.where(User.warehouse_id == warehouse_id)

    result = await db.execute(query.order_by(User.full_name))
    staff_list = []
    for user_row, wh_name in result.all():
        staff_list.append(
            StaffOut(
                id=user_row.id,
                email=user_row.email,
                login_id=user_row.login_id,
                full_name=user_row.full_name,
                role=user_row.role,
                warehouse_id=user_row.warehouse_id,
                warehouse_name=wh_name,
                is_active=user_row.is_active,
                created_at=user_row.created_at,
            )
        )
    return staff_list


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

    result = await db.execute(query.order_by(Location.name))
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
    result = await db.execute(query.order_by(Partner.name))
    return [PartnerOut.model_validate(p) for p in result.scalars().all()]
