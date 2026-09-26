"""
app/features/products/router.py

FastAPI router for products, categories, units of measure, and reorder rules.
"""
import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.features.products import service
from app.features.products.schemas import (
    CategoryCreate,
    CategoryOut,
    ProductCreate,
    ProductOut,
    ProductStockSummary,
    ProductUpdate,
    ReorderRuleCreate,
    ReorderRuleOut,
    UOMCreate,
    UOMOut,
)
from app.models.models import User

router = APIRouter(tags=["products"])

manager_or_admin = require_role("admin", "inventory_manager")


# --- Categories --------------------------------------------------------
@router.post("/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> CategoryOut:
    return await service.create_category(payload, db)


@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[CategoryOut]:
    return await service.list_categories(db)


# --- Units of Measure ---------------------------------------------------
@router.post("/units-of-measure", response_model=UOMOut, status_code=status.HTTP_201_CREATED)
async def create_uom(
    payload: UOMCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> UOMOut:
    return await service.create_uom(payload, db)


@router.get("/units-of-measure", response_model=list[UOMOut])
async def list_uoms(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[UOMOut]:
    return await service.list_uoms(db)


# --- Products ------------------------------------------------------------
@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> ProductOut:
    return await service.create_product(payload, db)


@router.get("/products", response_model=list[ProductOut])
async def list_products(
    search: str | None = None,
    category_id: uuid.UUID | None = None,
    is_active: bool | None = None,
    warehouse_id: uuid.UUID | None = None,
    location_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ProductOut]:
    return await service.list_products(
        db,
        search=search,
        category_id=category_id,
        is_active=is_active,
        warehouse_id=warehouse_id,
        location_id=location_id,
    )


@router.get("/products/{product_id}", response_model=ProductOut)
async def get_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ProductOut:
    return await service.get_product(product_id, db)


@router.patch("/products/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: uuid.UUID,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> ProductOut:
    return await service.update_product(product_id, payload, db)


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(manager_or_admin),
):
    await service.delete_product(product_id, db)


@router.get("/products/{product_id}/stock", response_model=ProductStockSummary)
async def get_product_stock(
    product_id: uuid.UUID,
    warehouse_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductStockSummary:
    effective_warehouse_id = warehouse_id
    if current_user.role == "warehouse_staff" and current_user.warehouse_id:
        effective_warehouse_id = current_user.warehouse_id
    return await service.get_product_stock_summary(product_id, db, warehouse_id=effective_warehouse_id)


# --- Reorder Rules ---------------------------------------------------------
@router.post("/reorder-rules", response_model=ReorderRuleOut, status_code=status.HTTP_201_CREATED)
async def create_reorder_rule(
    payload: ReorderRuleCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(manager_or_admin),
) -> ReorderRuleOut:
    return await service.create_reorder_rule(payload, db)


@router.get("/reorder-rules", response_model=list[ReorderRuleOut])
async def list_reorder_rules(
    product_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ReorderRuleOut]:
    return await service.list_reorder_rules(db, product_id=product_id)
