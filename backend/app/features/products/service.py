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
    Warehouse,
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
    sku = payload.sku
    if not sku:
        sku = f"SKU-{uuid.uuid4().hex[:6].upper()}"

    existing = await db.execute(select(Product).where(Product.sku == sku))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"SKU '{sku}' already exists",
        )

    uom_id = payload.uom_id
    if not uom_id:
        uom_res = await db.execute(select(UnitOfMeasure).limit(1))
        uom = uom_res.scalar_one_or_none()
        if uom:
            uom_id = uom.id
        else:
            raise HTTPException(status_code=400, detail="No Unit of Measure found in database")

    product = Product(
        sku=sku,
        name=payload.name,
        description=payload.description,
        category_id=payload.category_id,
        uom_id=uom_id,
        barcode=payload.barcode,
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)

    wh_id = payload.warehouse_id
    wh_name = None
    loc_id = payload.location_id
    loc_name = None
    qty = Decimal(str(payload.quantity)) if payload.quantity is not None else Decimal("0")

    if loc_id:
        loc = await db.get(Location, loc_id)
        if loc:
            loc_name = loc.name
            if not wh_id:
                wh_id = loc.warehouse_id
            if wh_id:
                wh = await db.get(Warehouse, wh_id)
                if wh:
                    wh_name = wh.name

            quant = StockQuant(
                product_id=product.id,
                location_id=loc_id,
                quantity=qty,
                reserved_qty=Decimal("0"),
            )
            db.add(quant)
            await db.commit()
    elif wh_id:
        wh = await db.get(Warehouse, wh_id)
        if wh:
            wh_name = wh.name

    return ProductOut(
        id=product.id,
        sku=product.sku,
        name=product.name,
        description=product.description,
        category_id=product.category_id,
        uom_id=product.uom_id,
        barcode=product.barcode,
        is_active=product.is_active,
        unit_cost=payload.unit_cost or Decimal("150"),
        warehouse_id=wh_id,
        warehouse_name=wh_name,
        location_id=loc_id,
        location_name=loc_name,
        qty_on_hand=qty,
        qty_available=qty,
    )


async def list_products(
    db: AsyncSession,
    search: str | None = None,
    category_id: uuid.UUID | None = None,
    is_active: bool | None = None,
    warehouse_id: uuid.UUID | None = None,
    location_id: uuid.UUID | None = None,
) -> list[ProductOut]:
    query = (
        select(
            Product,
            StockQuant.quantity,
            StockQuant.reserved_qty,
            Location.id.label("loc_id"),
            Location.name.label("loc_name"),
            Warehouse.id.label("wh_id"),
            Warehouse.name.label("wh_name"),
        )
        .outerjoin(StockQuant, StockQuant.product_id == Product.id)
        .outerjoin(Location, StockQuant.location_id == Location.id)
        .outerjoin(Warehouse, Location.warehouse_id == Warehouse.id)
    )
    if search:
        query = query.where(Product.name.ilike(f"%{search}%") | Product.sku.ilike(f"%{search}%"))
    if category_id:
        query = query.where(Product.category_id == category_id)
    if is_active is not None:
        query = query.where(Product.is_active == is_active)
    if warehouse_id:
        query = query.where(Warehouse.id == warehouse_id)
    if location_id:
        query = query.where(Location.id == location_id)

    result = await db.execute(query.order_by(Product.name))
    rows = result.all()

    products_map: dict[uuid.UUID, ProductOut] = {}
    for prod, quant_qty, reserved_qty, loc_id, loc_name, wh_id, wh_name in rows:
        qty = quant_qty if quant_qty is not None else Decimal("0")
        res = reserved_qty if reserved_qty is not None else Decimal("0")
        avail = qty - res
        if prod.id not in products_map:
            products_map[prod.id] = ProductOut(
                id=prod.id,
                sku=prod.sku,
                name=prod.name,
                description=prod.description,
                category_id=prod.category_id,
                uom_id=prod.uom_id,
                barcode=prod.barcode,
                is_active=prod.is_active,
                unit_cost=Decimal("150"),
                warehouse_id=wh_id,
                warehouse_name=wh_name,
                location_id=loc_id,
                location_name=loc_name,
                qty_on_hand=qty,
                qty_available=avail,
            )
        else:
            current = products_map[prod.id]
            current.qty_on_hand = (current.qty_on_hand or Decimal("0")) + qty
            current.qty_available = (current.qty_available or Decimal("0")) + avail
            if not current.warehouse_id and wh_id:
                current.warehouse_id = wh_id
                current.warehouse_name = wh_name
                current.location_id = loc_id
                current.location_name = loc_name

    return list(products_map.values())


async def delete_product(product_id: uuid.UUID, db: AsyncSession) -> None:
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    from sqlalchemy import delete as sa_delete
    await db.execute(sa_delete(StockQuant).where(StockQuant.product_id == product_id))
    await db.flush()
    await db.delete(product)
    await db.commit()


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
