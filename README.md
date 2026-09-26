<div align="center">

# 📦 StockFlow

### Enterprise Modular Inventory Management & Operational Intelligence System

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_/_15+-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Groq AI](https://img.shields.io/badge/AI_Copilot-Groq_Llama_3.3_70B-F05A28?style=for-the-badge&logo=meta&logoColor=white)](https://groq.com/)
[![TanStack Query](https://img.shields.io/badge/State-TanStack_Query_v5-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)](https://tanstack.com/query)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <b>A real-time, auditable inventory intelligence platform inspired by Odoo's double-entry stock engine.</b><br/>
  Features an append-only immutable ledger, row-level concurrency locking, grounded AI inventory copilot (Llama 3.3 70B via Groq), mobile QR scanning, predictive stockout velocity modeling, and "what-if" disruption simulation.
</p>

[Quickstart](#-quickstart--local-setup) • [Architecture](#-system-architecture) • [Double-Entry Engine](#-double-entry-inventory-engine) • [Key Features](#-core-capabilities) • [Database Design](#-database-architecture--schema-v2) • [Demo Walkthrough](#-5-minute-killer-demo-flow) • [API Reference](#-api-specification)

---

</div>

## 📌 Executive Summary & Problem Statement

In conventional ERPs and small-business setups, stock tracking is handled by manually updated spreadsheets or naïve increment/decrement database operations. This approach fails under real-world warehouse conditions, causing:
* **Phantom Inventory & Negative Stock:** Concurrent orders decrement stock below zero without row locks.
* **Lack of Accountability:** If a product count drops by 50 units, there is no immutable audit trail identifying whether it was sold, damaged, transferred, or stolen.
* **Reactive Procurement:** Managers only discover shortages *after* an order fails fulfillment, rather than anticipating depletion based on consumption velocity.

**StockFlow** completely rearchitects inventory tracking around **double-entry ledger movements**, strict database-level trigger constraints, and proactive intelligence:

> [!IMPORTANT]
> **The Core Invariant:** Stock never simply "appears" or "disappears." Every inventory change is a balanced, immutable movement between physical or virtual locations (`Vendor` $\rightarrow$ `Internal Warehouse`, `Warehouse` $\rightarrow$ `Customer`, `Rack A` $\rightarrow$ `Rack B`, or `Internal` $\rightarrow$ `Virtual Loss`).

---

## 🏛️ System Architecture

```mermaid
graph TB
    subgraph Client ["Frontend Layer (React 19 + Vite 8 + TanStack Query v5 + Motion 13)"]
        UI_Dash["Executive KPI Dashboard"]
        UI_Ops["Operations Hub (Receipts, Deliveries, Transfers, Adjustments)"]
        UI_QR["Mobile QR & Barcode Scanner"]
        UI_Timeline["Explainable Ledger Timeline"]
        UI_Copilot["AI Inventory Copilot Interface"]
        UI_Risk["Inventory Risk & Anomaly Sentinel"]
        UI_Sim["What-If Disruption Sandbox"]
    end

    subgraph API ["Backend API Layer (FastAPI Async 0.115 + Python 3.11)"]
        Router["REST APIRouter (/api/v1)"]
        AuthService["Auth & Token Service (JWT + Refresh Tokens)"]
        DocEngine["Document State Machine (Draft ➔ Waiting ➔ Ready ➔ Done)"]
        LedgerService["Stock Movement Execution Engine"]
        CopilotEngine["AI Copilot Service (Groq Llama 3.3 70B RAG)"]
        PredictiveService["Burn-Rate & Velocity Forecaster"]
        AnomalyEngine["Heuristic Anomaly Detector"]
        SimEngine["Digital Twin Disruption Simulator"]
    end

    subgraph Database ["Persistence Layer (PostgreSQL 15+ / Neon Cloud)"]
        Tables_Master["Master Data (Users, Warehouses, Locations, Products)"]
        Tables_Docs["Operations (stock_documents, stock_document_lines)"]
        Table_Ledger[("stock_ledger (Append-Only / Immutable)")]
        Table_Quants[("stock_quants (Fast-Read Real-Time Balances)")]
        Table_Alerts[("stock_alerts (Stockout & Anomaly Alerts)")]
        Table_Tokens[("refresh_tokens (Session Revocation)")]
        Trig_Quants["Trigger: fn_apply_ledger_to_quants (Row Locks + Balance Sync)"]
        Trig_DocNum["Trigger: fn_generate_document_number (RCPT, DELV, TRF, ADJ)"]
        Trig_Protect["Trigger: fn_reject_ledger_mutation (Blocks UPDATE/DELETE)"]
    end

    Client -->|REST API / JSON + Bearer JWT| Router
    Router --> AuthService & DocEngine & LedgerService & CopilotEngine & PredictiveService & AnomalyEngine & SimEngine

    DocEngine -->|Auto-Generated References| Trig_DocNum
    DocEngine --> Tables_Docs
    LedgerService -->|INSERT Validated Move| Table_Ledger
    Table_Ledger -->|BEFORE INSERT Trigger| Trig_Quants
    Trig_Quants -->|Atomic Increment / Decrement| Table_Quants
    Table_Ledger -->|Guarded by| Trig_Protect
    PredictiveService & AnomalyEngine --> Table_Alerts
    AuthService --> Table_Tokens & Tables_Master
```

---

## ⚖️ Double-Entry Inventory Engine

Borrowing the foundational concept behind modern financial accounting and Odoo Inventory, StockFlow enforces location-based inventory transitions:

| Operation Type | Source Location | Destination Location | Impact on Physical Stock | Auditing Purpose |
| :--- | :--- | :--- | :---: | :--- |
| **Receipt (Incoming)** | `Vendor Location` (Virtual) | `Internal Warehouse` | **$+Q$** | Inward vendor shipment validation |
| **Delivery (Outgoing)** | `Internal Warehouse` | `Customer Location` (Virtual) | **$-Q$** | Outward customer order fulfillment |
| **Internal Transfer** | `Warehouse 1 / Rack A` | `Warehouse 2 / Rack B` | **$\pm 0$** | Intra-company stock relocation |
| **Adjustment (Gain)** | `Virtual Adjustment` | `Internal Warehouse` | **$+\Delta$** | Cycle count surplus reconciliation |
| **Adjustment (Loss)** | `Internal Warehouse` | `Virtual Adjustment` | **$-\Delta$** | Damaged, expired, or shrinkage write-off |

### Architectural Guarantees
1. **Row-Level Concurrency Locking (`FOR UPDATE`):** When moving stock out of an internal location, the database trigger locks the corresponding quant row to verify available balance. If requested quantity exceeds available stock, the transaction rolls back immediately.
2. **Append-Only Immutability:** A dedicated PostgreSQL trigger (`trg_ledger_no_update`, `trg_ledger_no_delete`) rejects any modification to `stock_ledger`. Erroneous transactions are resolved exclusively via compensating adjustment movements.

---

## 🚀 Core Capabilities

### 1. Operations Lifecycle State Machine
All four inventory document types (`Receipt`, `Delivery Order`, `Internal Transfer`, `Stock Adjustment`) share a standardized lifecycle:

```mermaid
stateDiagram-v2
    [*] --> Draft : Create Document
    Draft --> Waiting : Confirm & Check Availability
    Waiting --> Ready : Stock Reserved / Checked
    Ready --> Done : Validate (Append to Ledger & Update Quants)
    Draft --> Canceled : Cancel
    Waiting --> Canceled : Cancel
    Ready --> Canceled : Cancel
```

* **Automated Sequential Numbering:** PostgreSQL sequences auto-generate human-readable document identifiers upon creation:
  * Receipts: `RCPT-000001`
  * Deliveries: `DELV-000001`
  * Transfers: `TRF-000001`
  * Adjustments: `ADJ-000001`
* **Mandatory Adjustment Reasoning:** Adjustments require an explicit audit explanation (`reason` column) such as *"Water damage in Rack B"* or *"Quarterly physical count variance"*.

---

### 2. 🤖 Grounded AI Inventory Copilot (Groq Llama 3.3 70B)
An integrated natural-language assistant powered by **Groq Cloud** (`llama-3.3-70b-versatile`) grounded strictly in live database views:

* **Direct SQL-Grounded Queries:**
  * *"Why did Steel Rods stock decrease this week?"* $\rightarrow$ Inspects `stock_ledger` and breaks down exact delivery notes (`DELV-000004`) and damage adjustments (`ADJ-000002`).
  * *"Which products will run out within the next 7 days?"* $\rightarrow$ Cross-references current quants against moving average daily usage.
  * *"Show me all adjustments created outside normal operating hours."*
* **Human-in-the-Loop Guardrail:** The AI operates in **read-only mode**. It can recommend reorder quantities or transfer allocations, but cannot mutate inventory without explicit user confirmation.

---

### 3. 📈 Predictive Velocity & Stockout Analytics
Moving beyond static minimum-quantity thresholds, StockFlow calculates dynamic consumption burn rates:

$$\text{Daily Burn Rate} = \frac{\sum \text{Deliveries over last } N \text{ days}}{N}$$
$$\text{Days Until Stockout} = \frac{\text{Current Available Quantity}}{\text{Daily Burn Rate}}$$

* **Proactive Stockout Risk:** Automatically triggers `stock_alerts` with `alert_type = 'stockout_risk'` when projected depletion breaches supplier lead-time buffers.
* **Suggested Reorder Sizing:** Dynamically suggests replenishment orders based on consumption velocity, maximum warehouse capacity, and safety stock factors.

---

### 4. 🔍 Explainable Stock Ledger (Visual Narrative Timeline)
Replaces unreadable tabular dumps with an interactive visual ledger timeline for every product:

```text
Opening Balance: 100 kg
  ├──  + 50 kg   Receipt     RCPT-000001   (Supplier: Steel Corp)       [10:15 AM]
  ├──  - 20 kg   Delivery    DELV-000001   (Customer: Acme Industries)  [02:30 PM]
  └──  -  3 kg   Adjustment  ADJ-000001   (Reason: Bent in transit)    [04:45 PM]
Current Available Balance: 127 kg
```

Every ledger entry permanently records `source_qty_after`, `dest_qty_after`, authorizing user UUID, and associated document line reference.

---

### 5. 📱 Mobile QR & Barcode Scanning
* **Camera-Based Scanning:** Fast optical scanning directly in mobile or desktop browsers without dedicated handheld terminal hardware.
* **Operational Flow:**
  1. Scan warehouse location QR code (`LOC-WH1-RACK-A`).
  2. Scan product packaging barcode (`SKU-STEEL-001`).
  3. Input verified quantity and tap **Validate**.
  4. Instant real-time balance sync across all active sessions.

---

### 6. 🛡️ Inventory Risk Center & Anomaly Detection
Continuously monitors warehouse transactions for patterns indicative of operational error, shrinkage, or manipulation:
* **Threshold Smurfing:** Detects users submitting multiple small adjustments just beneath manager approval limits ($< 10$ units).
* **Off-Hours Operations:** Flags moves executed outside standard operating hours (e.g., weekend or late-night adjustments).
* **Inventory Bouncing:** Detects items repeatedly shuttled between identical source and destination locations.
* **Discrepancy Hotspots:** Identifies warehouse racks with persistent physical-count variances.

---

### 7. 🔮 "What-If" Disruption Simulator (Digital Twin)
An in-memory simulation sandbox that lets logistics managers stress-test operational disruptions without altering live database records:
* **Scenario:** *"What happens if Supplier A delays shipment by 10 days?"*
* **Simulation Output:**
  * Projects production and fulfillment burn down.
  * Identifies affected customer deliveries and revenue at risk.
  * Recommends mitigations: *"Warehouse 2 has 40 kg surplus. Scheduling internal transfer TRF will bridge demand for 5 days."*

---

## 🎬 5-Minute Killer Demo Flow

```text
Step 1: RECEIVE GOODS VIA QR SCAN
        - Staff scans vendor QR code for 100 units of "Steel Rods".
        - Validates Receipt RCPT-000001.
        - Dashboard immediately reflects +100 units in physical inventory.

Step 2: INTERNAL RACK TRANSFER
        - Move 60 units from "Main Warehouse" to "Production Floor".
        - Validates Transfer TRF-000001.
        - Total company stock remains 100 units; location-level breakdown updates instantly.

Step 3: CUSTOMER ORDER FULFILLMENT
        - Customer order arrives for 20 units.
        - Staff picks, packs, and validates Delivery DELV-000001.
        - Physical stock decrements to 80 units.

Step 4: RECORD DAMAGED STOCK (ADJUSTMENT)
        - Staff discovers 3 units damaged by water leak.
        - Creates Adjustment ADJ-000001 (Reason: "Water damage during transit").
        - Available balance reconciles to 77 units.

Step 5: INSPECT EXPLAINABLE STOCK LEDGER
        - Open Steel Rods ledger view.
        - Demonstrates full timeline: 0 -> +100 (Receipt) -> Transfer 60 -> -20 (Delivery) -> -3 (Adjustment) = 77 units.

Step 6: QUERY AI COPILOT
        - Prompt: "Why did Steel Rods decrease today?"
        - AI responds with exact citations: "20 units delivered via DELV-000001 and 3 units written off via ADJ-000001."

Step 7: REVIEW PREDICTIVE ALERTS & ANOMALY CENTER
        - View Burn-Rate Card: "At current velocity (20 units/day), Steel Rods will stock out in 3.8 days."
        - View Risk Center: Highlights the 3-unit damage anomaly for manager review.
```

---

## 🛠️ Technology Stack

| Layer | Technology | Version | Architectural Responsibility |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | **React** | `19.2+` | Modern UI with concurrency & React 19 hooks |
| | **Vite** | `8.3+` | Next-gen lightning-fast dev server and bundler |
| | **TanStack Query** | `5.103+` | Asynchronous server-state management & optimistic cache |
| | **Motion** | `13.4+` | Declarative spring animations (Framer Motion) |
| | **React Router** | `7.18+` | Client-side routing & nested layouts |
| | **Oxlint** | `1.81+` | Ultra-fast JS/JSX static analysis and linting |
| **Backend API** | **FastAPI** | `0.115.0` | Asynchronous REST framework with auto OpenAPI documentation |
| | **Python** | `3.11+` | Core async backend runtime |
| | **SQLAlchemy** | `2.0.35` | Modern async ORM & typed query builder |
| | **asyncpg** | `0.29.0` | Native asynchronous PostgreSQL database driver with SSL support |
| | **Pydantic** | `2.9.2` | Data validation, schema contracts & settings parsing |
| | **PyJWT + Passlib** | `3.3 / 1.7` | Stateless access tokens, bcrypt hashing & refresh token rotation |
| **AI Copilot** | **Groq SDK** | `0.11.0` | Ultra-fast cloud inference for `llama-3.3-70b-versatile` |
| **Database** | **PostgreSQL** | `15+` / Neon | Cloud/local serverless DB with triggers, row locks & extensions |
| | *Extensions* | - | `uuid-ossp`, `pgcrypto`, `citext`, `pg_trgm` |

---

## 🗄️ Database Architecture & Schema (v2)

The database strictly separates **fast-read current balances (`stock_quants`)** from the **append-only audit trail (`stock_ledger`)**. The complete DDL is located in [`backend/app/db/schema.sql`](backend/app/db/schema.sql).

```mermaid
erDiagram
    users ||--o{ refresh_tokens : "has active"
    users ||--o{ stock_documents : "creates / validates"
    users ||--o{ stock_ledger : "authorizes"
    warehouses ||--o{ locations : "contains"
    warehouses ||--o{ reorder_rules : "scoped to"
    product_categories ||--o{ products : "categorizes"
    units_of_measure ||--o{ products : "measures"
    products ||--o{ stock_quants : "tracks balance"
    locations ||--o{ stock_quants : "holds"
    products ||--o{ stock_document_lines : "listed in"
    stock_documents ||--o{ stock_document_lines : "contains"
    stock_document_lines ||--o{ stock_ledger : "executes"
    products ||--o{ stock_ledger : "transacts"
    locations ||--o{ stock_ledger : "source / dest"
    products ||--o{ stock_alerts : "triggers"

    users {
        uuid id PK
        citext email UK
        text password_hash
        varchar full_name
        user_role role
        boolean is_active
    }

    refresh_tokens {
        uuid id PK
        uuid user_id FK
        text token_hash UK
        timestamptz expires_at
        timestamptz revoked_at
    }

    warehouses {
        uuid id PK
        varchar name
        varchar code UK
        text address
        boolean is_active
    }

    locations {
        uuid id PK
        uuid warehouse_id FK
        varchar name
        varchar code UK
        location_type type "internal | vendor | customer | virtual_adjustment"
    }

    products {
        uuid id PK
        varchar sku UK
        varchar name
        uuid category_id FK
        uuid uom_id FK
        varchar barcode UK
        boolean is_active
    }

    stock_quants {
        uuid id PK
        uuid product_id FK
        uuid location_id FK
        numeric quantity
        numeric reserved_qty
    }

    stock_documents {
        uuid id PK
        varchar document_number UK "Auto-generated e.g. RCPT-000001"
        document_type type "receipt | delivery | internal_transfer | adjustment"
        document_status status "draft | waiting | ready | done | canceled"
        uuid source_location_id FK
        uuid dest_location_id FK
        uuid warehouse_id FK
        uuid created_by FK
        uuid validated_by FK
        timestamptz validated_at
    }

    stock_document_lines {
        uuid id PK
        uuid document_id FK
        uuid product_id FK
        numeric quantity_expected
        numeric quantity_done
        text reason "Required for adjustments"
    }

    stock_ledger {
        uuid id PK
        uuid document_line_id FK
        uuid product_id FK
        uuid source_location_id FK
        uuid dest_location_id FK
        numeric quantity
        numeric source_qty_after
        numeric dest_qty_after
        uuid performed_by FK
        timestamptz created_at
    }

    stock_alerts {
        uuid id PK
        uuid product_id FK
        uuid warehouse_id FK
        varchar alert_type "low_stock | out_of_stock | stockout_risk | anomaly"
        numeric current_qty
        numeric threshold_qty
        boolean is_resolved
    }
```

### PostgreSQL Trigger Highlights
* **`refresh_tokens` Table:** Hashed refresh tokens with `revoked_at` timestamp. Access tokens remain short-lived (30 min) and stateless, while sessions can be terminated immediately on logout.
* **Auto-Generating Sequential References:** Sequence-backed trigger (`fn_generate_document_number`) automatically assigns `RCPT-000001`, `DELV-000001`, `TRF-000001`, or `ADJ-000001`.
* **Atomic Trigger Updates:** `fn_apply_ledger_to_quants` runs `BEFORE INSERT ON stock_ledger`. It enforces `FOR UPDATE` locks on physical locations, updates `stock_quants`, and writes resulting balances directly onto the movement row (`source_qty_after`, `dest_qty_after`).
* **Trigram Index:** `CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);` enables fast fuzzy matching across product names.

---

## 📡 API Specification

Interactive Swagger UI documentation is accessible at `http://localhost:8000/docs`.

### Authentication & Sessions
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/v1/auth/register` | Register new user account | No |
| `POST` | `/api/v1/auth/login` | Authenticate; returns access & refresh tokens | No |
| `POST` | `/api/v1/auth/refresh` | Rotate refresh token and issue new access token | Yes |
| `POST` | `/api/v1/auth/logout` | Revoke refresh token and terminate session | Yes |
| `POST` | `/api/v1/auth/forgot-password` | Request 6-digit password reset OTP | No |
| `POST` | `/api/v1/auth/reset-password` | Validate OTP and update password | No |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile & permissions | Yes |

### Master Data (Products & Warehouses)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/products` | Query products (supports fuzzy search, category filter) | Yes |
| `POST` | `/api/v1/products` | Create product (SKU, barcode, UoM, initial stock) | Yes (Manager+) |
| `GET` | `/api/v1/products/{id}/stock` | Real-time quant breakdown across all locations | Yes |
| `GET` | `/api/v1/warehouses` | List all warehouses and sub-locations | Yes |
| `POST` | `/api/v1/warehouses` | Create a new warehouse | Yes (Admin) |
| `GET` | `/api/v1/reorder-rules` | Query min/max/reorder thresholds per location | Yes |

### Operations & Movements
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/receipts` | List incoming vendor receipts | Yes |
| `POST` | `/api/v1/receipts` | Create and validate incoming receipt | Yes |
| `GET` | `/api/v1/deliveries` | List outgoing customer deliveries | Yes |
| `POST` | `/api/v1/deliveries` | Pick, pack, and validate customer delivery | Yes |
| `GET` | `/api/v1/transfers` | List intra-warehouse transfers | Yes |
| `POST` | `/api/v1/transfers` | Move stock between locations or racks | Yes |
| `GET` | `/api/v1/adjustments` | List cycle counts and inventory reconciliations | Yes |
| `POST` | `/api/v1/adjustments` | Reconcile physical count with mandatory reason | Yes (Manager+) |

### Ledger & Intelligence
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/ledger` | Query append-only ledger entries with pagination | Yes |
| `GET` | `/api/v1/ledger/timeline/{product_id}` | Retrieve explainable audit timeline for product | Yes |
| `GET` | `/api/v1/dashboard/kpis` | Real-time KPI metrics (stock count, low stock, pending) | Yes |
| `POST` | `/api/v1/copilot/chat` | Natural-language query interface powered by Groq Llama 3.3 | Yes |
| `POST` | `/api/v1/simulation/disruption` | Run what-if delay scenario simulation | Yes (Manager+) |

---

## 📁 Repository Structure

```text
StockFlow/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── adjustments.py       # Physical reconciliation & reason logging
│   │   │       ├── auth.py              # Login, Refresh, OTP, RBAC
│   │   │       ├── dashboard.py         # Real-time KPIs & alert queries
│   │   │       ├── deliveries.py        # Outgoing fulfillment (DELV-000001)
│   │   │       ├── ledger.py            # Explainable timeline & audit history
│   │   │       ├── products.py          # Catalog & multi-location quant view
│   │   │       ├── receipts.py          # Inward vendor shipments (RCPT-000001)
│   │   │       ├── transfers.py         # Internal location transfers (TRF-000001)
│   │   │       ├── warehouses.py        # Multi-warehouse hierarchy & racks
│   │   │       └── router.py            # Aggregated v1 router
│   │   ├── core/
│   │   │   ├── config.py                # Environment configuration (Pydantic Settings)
│   │   │   ├── database.py              # Asyncpg engine with SSL handling
│   │   │   └── security.py              # Bcrypt, JWT & token hashing
│   │   ├── db/
│   │   │   └── schema.sql               # Production PostgreSQL schema (v2) with triggers
│   │   ├── models/
│   │   │   └── models.py                # SQLAlchemy ORM models
│   │   ├── schemas/
│   │   │   └── auth.py                  # Pydantic v2 request/response schemas
│   │   └── main.py                      # FastAPI entry point & CORS
│   ├── requirements.txt                 # Backend dependencies
│   └── .env.example                     # Environment template
├── frontend/
│   ├── src/
│   │   ├── assets/                      # Icons, logos, and illustration assets
│   │   ├── App.css                      # Core app layout styling
│   │   ├── App.jsx                      # Main React application component
│   │   ├── index.css                    # Base styling directives
│   │   └── main.jsx                     # Application bootstrap
│   ├── package.json                     # React 19, TanStack Query, Motion, React Router
│   ├── vite.config.js                   # Vite 8 configuration
│   └── .oxlintrc.json                   # Oxlint configuration
├── .gitignore                           # Git ignore rules
└── README.md                            # Project documentation
```

---

## 🚀 Quickstart & Local Setup

### 1. Database Setup

You can use **Neon Serverless PostgreSQL** (recommended for zero-setup cloud DB) or a local PostgreSQL instance:

```bash
# 1. Ensure your DATABASE_URL is configured in backend/.env
# 2. Run the automated database initialization script:
cd backend
python app/db/init_db.py
```

Or manually via `psql` if using a local instance:
```bash
psql -U postgres -c "CREATE DATABASE stocksense_db;"
psql -U postgres -d stocksense_db -f backend/app/db/schema.sql
```

---

### 2. Backend Setup (FastAPI)

1. Navigate to the `backend` directory:
```bash
cd backend
```

2. Create and activate a Python 3.11 virtual environment:
```powershell
# Windows
py -3.11 -m venv venv
.\venv\Scripts\activate

# Linux / macOS
python3.11 -m venv venv
source venv/bin/activate
```

3. Install all dependencies:
```bash
pip install -r requirements.txt
```

4. Configure your `.env` file:
```bash
cp .env.example .env
```
Update `.env` with your database URL, JWT secret, and optional `GROQ_API_KEY`:
```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
SECRET_KEY=generate_a_secure_random_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Optional: Groq API key for the AI Copilot
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
ENVIRONMENT=development
```

5. Launch the FastAPI server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Interactive API Documentation will be live at **`http://localhost:8000/docs`**.

---

### 3. Frontend Setup (React 19 + Vite)

1. Open a new terminal and navigate to `frontend`:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the Vite development server:
```bash
npm run dev
```
Open your browser at **`http://localhost:5173`**.

---

## 🔐 Security & Role-Based Access Control (RBAC)

| Role | Scope & Permissions |
| :--- | :--- |
| **`warehouse_staff`** | Create and execute Receipts, fulfill Deliveries, schedule Internal Transfers, scan QR codes, and input cycle count observations. |
| **`inventory_manager`** | All staff capabilities + validate Stock Adjustments, configure reorder rules, review the Inventory Risk Center, and run Disruption Simulations. |
| **`admin`** | Full administrative governance, user account provisioning, role assignment, warehouse creation, and security audit log inspection. |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
