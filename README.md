<div align="center">


# 📦 StockFlow


### Auditable Inventory Management & Operational Intelligence


[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Groq AI](https://img.shields.io/badge/AI_Copilot-Groq_Llama_3.3-F05A28?style=for-the-badge&logo=meta&logoColor=white)](https://groq.com/)
[![Tests](https://img.shields.io/badge/Tests-37%20passing-brightgreen?style=for-the-badge)](https://github.com/ItsKrishna-dev/StockFlow)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)


<p>
  StockFlow is a transaction-driven inventory platform that records every validated stock movement, verifies data integrity, explains inventory changes, detects operational risk, recommends replenishment, and provides a read-only AI copilot.
</p>


[Quickstart](#-quickstart) • [Features](#-features) • [Architecture](#-architecture) •[Testing](#-testing)


</div>


<div align="center">
<img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="100%">
</div>


## Overview


StockFlow replaces spreadsheets and fragmented warehouse records with centralized, location-aware inventory management for inventory managers, warehouse staff, and administrators.


It supports:


- Products, categories, and units of measure.
- Warehouses and internal storage locations.
- Receipts, deliveries, transfers, and adjustments.
- Warehouse-specific reorder rules.
- Dashboard KPIs and low-stock visibility.
- Append-only stock history.
- Integrity and risk checks.
- Explainable replenishment recommendations.
- A read-only Groq-powered inventory copilot.


> **Core invariant:** Stock changes only through a validated, traceable movement between source and destination locations.

<div align="center">
<img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="100%">
</div>

## Features


### Core inventory workflows


| Operation | Movement | Result |
|---|---|---|
| Receipt | Vendor → Internal | Stock increases |
| Delivery | Internal → Customer | Stock decreases |
| Internal transfer | Internal → Internal | Total stock stays unchanged |
| Adjustment gain | Virtual adjustment → Internal | Stock increases |
| Adjustment loss | Internal → Virtual adjustment | Stock decreases |


Every validated operation creates an append-only ledger entry. PostgreSQL triggers update current balances and reject insufficient stock. Completed documents receive automatic references such as `RCPT-000001`, `DELV-000001`, `TRF-000001`, and `ADJ-000001`.


### Master data and security


- Product, category, barcode, and unit-of-measure management.
- Multi-warehouse and hierarchical location support.
- JWT authentication with rotating refresh tokens.
- OTP-based password reset.
- Role-based access for `admin`, `inventory_manager`, and `warehouse_staff`.
- Bcrypt password hashing.


### Inventory intelligence


- **Integrity checker:** verifies ledger-to-quant consistency, missing movements, invalid document states, negative stock, duplicate movements, and missing adjustment reasons.
- **Explainable ledger:** shows what changed, why it changed, who validated it, and which locations were affected.
- **Replenishment recommendations:** calculates usage, lead time, safety stock, reorder point, and estimated stockout days using transparent formulas.
- **Risk Center:** identifies large adjustments, frequent adjustments, repeated cancellations, and recurring stockout patterns.
- **AI copilot:** answers fixed read-only inventory questions using verified backend data. It cannot execute SQL, create documents, validate operations, or modify stock.

<div align="center">
<img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="100%">
</div>

## Architecture

```mermaid
graph TB
    Frontend["React Frontend"] --> API["FastAPI REST API"]
    API --> Auth["Auth & RBAC"]
    API --> Master["Products, Warehouses, Locations"]
    API --> Operations["Receipts, Deliveries, Transfers, Adjustments"]
    API --> Intelligence["Integrity, Ledger, Risk, Replenishment"]
    API --> Copilot["Read-only Groq Copilot"]
    Operations --> Ledger["Append-only stock_ledger"]
    Ledger --> Trigger["PostgreSQL stock trigger"]
    Trigger --> Quants["Current stock_quants"]
    Intelligence --> Ledger
    Intelligence --> Quants
```

### Backend structure


```text
backend/app/features/
├── auth/
├── dashboard/
├── integrity/
├── ledger/
├── operations/
├── products/
├── recommendations/
├── risk/
└── warehouses/
```


Each feature contains its own router, service, and schemas. Shared configuration, security, database, and ORM models live under `backend/app/core/` and `backend/app/models/`.


<div align="center">
<img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="100%">
</div>

## Database Design


The database separates current balances from immutable history:


- `stock_quants`: current quantity by product and location.
- `stock_ledger`: append-only movement history.
- `stock_documents`: receipt, delivery, transfer, and adjustment headers.
- `stock_document_lines`: products and quantities for each document.
- `reorder_rules`: thresholds, lead time, safety stock, and reorder quantity per product and warehouse.
- `stock_alerts`: low-stock, stockout-risk, and anomaly alerts.


Important PostgreSQL protections:


- `fn_apply_ledger_to_quants` updates balances during ledger insertion.
- `fn_reject_ledger_mutation` blocks ledger updates and deletes.
- Document-number sequences generate human-readable references.
- Database constraints prevent invalid quantities and locations.
- Internal stock deductions use row-level locking.

<div align="center">
<img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="100%">
</div>

## Quickstart


### 1. Configure Neon


Create `backend/.env` from the example:


```bash
cd backend
cp .env.example .env
```


Use the async SQLAlchemy Neon URL:


```env
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@NEON_HOST/neondb?sslmode=require&channel_binding=require
SECRET_KEY=replace_with_a_long_random_secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
GROQ_API_KEY=optional_groq_key
GROQ_MODEL=llama-3.3-70b-versatile
ENVIRONMENT=development
```


Never commit `.env` or expose database credentials to the frontend.


### 2. Apply schema and migrations


Run the schema in the Neon SQL Editor:


```text
backend/app/db/schema.sql
```


Apply migrations in order, including:


```text
backend/app/db/migrations/002_add_reorder_planning_fields.sql
```


Seed reference data without installing PostgreSQL locally:


```bash
cd backend
python scripts/seed_data.py
```


### 3. Install and run the backend


```bash
cd backend
python -m venv venv
```


Linux/macOS:


```bash
source venv/bin/activate
```


Windows PowerShell:


```powershell
venv\Scripts\Activate.ps1
```


```bash
pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```


API documentation is available at `http://localhost:8000/docs`.


### 4. Run the frontend


```bash
cd frontend
npm install
npm run dev
```


Set:


```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```


<div align="center">
<img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="100%">
</div>

## Testing


Run the complete backend test suite:


```bash
cd backend
pytest -q
python -c "from app.main import app; print('Import successful')"
```


Health checks:


```bash
curl http://localhost:8000/health
curl http://localhost:8000/health/db
```


The test suite covers authentication, operations, dashboard warehouse scoping, eager loading, ledger summaries, integrity checks, replenishment recommendations, risk rules, and copilot behavior.

<div align="center">
<img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="100%">
</div>

## Scope


The current hackathon scope intentionally excludes:


- Multi-agent AI.
- Offline warehouse mode.
- RFID hardware.
- Full digital-twin simulation.
- Distribution game mode.
- Full procurement and accounting.
- Advanced ML forecasting.
- Supplier portals.
- Blockchain storage.


## License


This project is licensed under the [MIT License](LICENSE).


![Wave](https://raw.githubusercontent.com/mayhemantt/mayhemantt/Update/svg/Bottom.svg)