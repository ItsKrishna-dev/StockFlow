"""
app/features/products/service.py

Domain service logic for products, categories, units of measure,
product-level stock summaries, and reorder rules.
"""
import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.products.schemas import (
    CategoryCreate,
    CategoryOut,
    ProductCreate,
    ProductOut,
    ProductStockByLocation,
    ProductStockSummary,
    ProductUpdate,
    ReorderRuleCreate,
    ReorderRuleOut,
    UOMCreate,
    UOMOut,
)
from app.models.models import (
    Location,
    Product,
    ProductCategory,
    ReorderRule,
    StockQuant,
    UnitOfMeasure,
)


# --- Category Service Functions ---
async def create_category(payload: CategoryCreate, db: AsyncSession) -> CategoryOut:
    category = ProductCategory(**payload.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return CategoryOut.model_validate(category)


async def list_categories(db: AsyncSession) -> list[CategoryOut]:
    result = await db.execute(select(ProductCategory))
    return [CategoryOut.model_validate(c) for c in result.scalars().all()]


# --- Unit of Measure Service Functions ---
async def create_uom(payload: UOMCreate, db: AsyncSession) -> UOMOut:
    uom = UnitOfMeasure(**payload.model_dump())
    db.add(uom)
    await db.commit()
    await db.refresh(uom)
    return UOMOut.model_validate(uom)


async def list_uoms(db: AsyncSession) -> list[UOMOut]:
    result = await db.execute(select(UnitOfMeasure))
    return [UOMOut.model_validate(u) for u in result.scalars().all()]


# --- Product Service Functions ---
async def create_product(payload: ProductCreate, db: AsyncSession) -> ProductOut:
    existing = await db.execute(select(Product).where(Product.sku == payload.sku))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"SKU '{payload.sku}' already exists",
        )

    product = Product(**payload.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return ProductOut.model_validate(product)


async def list_products(
    db: AsyncSession,
    search: str | None = None,
    category_id: uuid.UUID | None = None,
    is_active: bool | None = None,
) -> list[ProductOut]:
    query = select(Product)
    if search:
        query = query.where(Product.name.ilike(f"%{search}%") | Product.sku.ilike(f"%{search}%"))
    if category_id:
        query = query.where(Product.category_id == category_id)
    if is_active is not None:
        query = query.where(Product.is_active == is_active)

    result = await db.execute(query.order_by(Product.name))
    return [ProductOut.model_validate(p) for p in result.scalars().all()]


async def get_product(product_id: uuid.UUID, db: AsyncSession) -> ProductOut:
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return ProductOut.model_validate(product)


async def update_product(
    product_id: uuid.UUID,
    payload: ProductUpdate,
    db: AsyncSession,
) -> ProductOut:
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    await db.commit()
    await db.refresh(product)
    return ProductOut.model_validate(product)


async def get_product_stock_summary(
    product_id: uuid.UUID,
    db: AsyncSession,
) -> ProductStockSummary:
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    result = await db.execute(
        select(StockQuant, Location)
        .join(Location, StockQuant.location_id == Location.id)
        .where(StockQuant.product_id == product_id, Location.type == "internal")
    )
    rows = result.all()

    by_location = [
        ProductStockByLocation(
            location_id=loc.id,
            location_name=loc.name,
            location_code=loc.code,
            warehouse_id=loc.warehouse_id,
            quantity=quant.quantity,
            reserved_qty=quant.reserved_qty,
            available_qty=quant.quantity - quant.reserved_qty,
        )
        for quant, loc in rows
    ]

    total_quantity = sum((row.quantity for row in by_location), start=Decimal("0"))
    total_available = sum((row.available_qty for row in by_location), start=Decimal("0"))

    return ProductStockSummary(
        product_id=product.id,
        sku=product.sku,
        name=product.name,
        total_quantity=total_quantity,
        total_available=total_available,
        by_location=by_location,
    )


# --- Reorder Rule Service Functions ---
async def create_reorder_rule(
    payload: ReorderRuleCreate,
    db: AsyncSession,
) -> ReorderRuleOut:
    rule = ReorderRule(**payload.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return ReorderRuleOut.model_validate(rule)


async def list_reorder_rules(
    db: AsyncSession,
    product_id: uuid.UUID | None = None,
) -> list[ReorderRuleOut]:
    query = select(ReorderRule).where(ReorderRule.is_active.is_(True))
    if product_id:
        query = query.where(ReorderRule.product_id == product_id)
    result = await db.execute(query)
    return [ReorderRuleOut.model_validate(r) for r in result.scalars().all()]
