"""
app/main.py
Application entrypoint. Every module's router is mounted here under
/api/v1 — this is the only file that needs to change when a new module
is added.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.adjustments import router as adjustments_router
from app.api.v1.auth import router as auth_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.deliveries import router as deliveries_router
from app.api.v1.ledger import router as ledger_router
from app.api.v1.products import router as products_router
from app.api.v1.receipts import router as receipts_router
from app.api.v1.transfers import router as transfers_router
from app.api.v1.warehouses import router as warehouses_router
from app.core.config import settings

app = FastAPI(
    title="StockSense API",
    description="Modular Inventory Management System backend",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"

app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(products_router, prefix=API_PREFIX)
app.include_router(warehouses_router, prefix=API_PREFIX)
app.include_router(receipts_router, prefix=API_PREFIX)
app.include_router(deliveries_router, prefix=API_PREFIX)
app.include_router(transfers_router, prefix=API_PREFIX)
app.include_router(adjustments_router, prefix=API_PREFIX)
app.include_router(ledger_router, prefix=API_PREFIX)
app.include_router(dashboard_router, prefix=API_PREFIX)


@app.get("/health", tags=["system"])
async def health_check() -> dict:
    return {"status": "ok", "environment": settings.ENVIRONMENT}


@app.get("/health/db", tags=["system"])
async def database_health_check() -> dict:
    from sqlalchemy import text

    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT current_database(), now()"))
        database_name, server_time = result.one()

    return {"status": "ok", "database": database_name, "server_time": server_time.isoformat()}
