"""
app/main.py

Application entrypoint. Mounts all v1 routers under /api/v1 and exposes
/health for uptime checks. As you add products.py, receipts.py, etc. to
app/api/v1/, just import and include them here (or better, aggregate
them in app/api/v1/router.py and include that single router — shown
commented below for when you have more than 2-3 route modules).
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.auth import router as auth_router
from app.core.config import settings

app = FastAPI(
    title="StockSense API",
    description="Modular Inventory Management System backend",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")

# As more modules are ready, add them the same way, e.g.:
# from app.api.v1.products import router as products_router
# app.include_router(products_router, prefix="/api/v1")


@app.get("/health", tags=["system"])
async def health_check() -> dict:
    return {"status": "ok", "environment": settings.ENVIRONMENT}
