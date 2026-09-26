# StockSense — Antigravity Project Context

## Document purpose

This document is **context only** for Antigravity.

Antigravity must read and understand this project context, architecture, scope, design direction, and constraints.

## Critical instruction

Do not modify, create, delete, refactor, generate, or execute anything based only on this document.

Do not:

- Change existing frontend files.
- Change existing backend files.
- Change database schema.
- Create new routes.
- Create new components.
- Install packages.
- Run migrations.
- Run deployment commands.
- Commit or push code.
- Make design decisions not explicitly requested by the user.
- Assume that a task has been authorized.

Wait for a separate, explicit user prompt before taking any implementation action.

When the user later gives a task, follow that task only. If the task conflicts with this context, ask for clarification before making changes.

---

# 1. Project identity

## Product name

StockSense

## Product category

Explainable inventory intelligence platform.

## Tagline

> Know what you have, know what is at risk, and know what to do next.

## Target users

- Inventory managers.
- Warehouse staff.
- Small and medium-sized business owners.
- Supervisors and auditors.

## Main problem

Businesses often manage stock through manual registers, spreadsheets, and disconnected records. This leads to:

- Incorrect stock quantities.
- Poor location-level visibility.
- Unexpected stockouts.
- Overstock and blocked working capital.
- Unclear stock adjustments.
- Weak accountability for stock movements.

StockSense centralizes inventory operations and adds explainable intelligence on top of the stock data.

---

# 2. Core product promise

StockSense does not only record inventory history.

It should help a manager:

1. Record stock movements.
2. Understand current quantities by location.
3. Identify stockout risk.
4. Detect unusual activity.
5. Receive a reorder recommendation.
6. Understand why the recommendation was generated.
7. Approve or review the suggested action.

The main product loop is:

```text
Record
  → Understand
  → Predict
  → Recommend
  → Review or approve
```

---

# 3. Original functional scope

The original StockSense requirement includes:

- Authentication.
- Dashboard.
- Product management.
- Product categories.
- Units of measure.
- Receipts for incoming goods.
- Delivery orders for outgoing goods.
- Internal transfers between locations.
- Stock adjustments.
- Movement history.
- Low-stock alerts.
- Multi-warehouse support.
- SKU search.
- Dynamic filters.
- Warehouse settings.
- User profile and logout.

The hackathon MVP adds:

- Stockout-risk scoring.
- Days-of-cover calculation.
- Reorder recommendation.
- Explainable anomaly detection.
- Natural-language inventory assistant.

The intelligence layer should remain explainable and human-approved.

---

# 4. Product differentiation

Basic inventory management is not by itself the unique feature.

The differentiating experience is:

> Every validated stock movement updates the ledger, changes current stock, recalculates risk, explains the result, and recommends the next action.

Primary intelligent features:

## Stockout risk

Calculate days of cover:

\[
\text{Days of Cover}
=
\frac{\text{Available Stock}}{\text{Average Daily Usage}}
\]

Suggested risk levels:

- Critical: less than 3 days.
- Warning: 3 to 7 days.
- Watch: 7 to 14 days.
- Safe: more than 14 days.

These thresholds can be configurable later.

## Reorder recommendation

Use an explainable formula:

\[
\text{Reorder Quantity}
=
\text{Demand During Lead Time}
+
\text{Safety Stock}
-
\text{Current Available Stock}
\]

Where:

\[
\text{Demand During Lead Time}
=
\text{Average Daily Usage}
\times
\text{Supplier Lead Time}
\]

The interface should show the calculation when requested.

## Anomaly detection

The prototype can use transparent rules, such as:

```text
IF adjustment quantity > 2 × average adjustment quantity
THEN flag as unusual

IF an adjustment occurs outside configured business hours
THEN add a warning

IF the same SKU is adjusted more than 3 times in 7 days
THEN flag repeated mismatch
```

Use neutral language:

> Unusual movement detected. Please verify the physical quantity and approval record.

Do not accuse a user of theft or fraud.

## Inventory assistant

The assistant should answer inventory questions from current backend data.

Supported prototype questions may include:

- Which products need attention today?
- Why is Steel Rods critical?
- What should I reorder?
- Show unusual adjustments.
- Summarize today’s movements.

The assistant must not invent quantities. Responses should include the data used to support the explanation.

---

# 5. Architecture overview

Preferred logical architecture:

```text
Frontend application
        |
        v
Backend API or server actions
        |
        +--> Products
        +--> Stock documents
        +--> Stock document lines
        +--> Stock ledger
        +--> Stock balances
        +--> Risk engine
        +--> Reorder engine
        +--> Anomaly engine
        +--> Assistant query layer
        |
        v
PostgreSQL database
```

The database separates current balances from historical events:

```text
stock_documents
        ↓
stock_document_lines
        ↓
stock_ledger
        ↓
stock_quants
```

## Current balances

`stock_quants` is the fast-read table for current quantity by product and location.

## Historical movements

`stock_ledger` is the append-only audit trail.

## Business operations

`stock_documents` represents receipts, deliveries, internal transfers, and adjustments.

## Product lines

`stock_document_lines` stores expected and completed quantities for each product on a document.

---

# 6. Database model context

The database uses PostgreSQL and UUID identifiers.

Important entities:

```text
users
otp_tokens
warehouses
locations
product_categories
units_of_measure
products
reorder_rules
partners
stock_quants
stock_documents
stock_document_lines
stock_ledger
stock_alerts
```

## Location types

Locations are categorized as:

- `internal`: physical warehouse, rack, production floor, or dispatch area.
- `vendor`: supplier location.
- `customer`: customer location.
- `virtual_adjustment`: inventory gain or inventory loss location.

Only internal locations represent physical warehouse inventory.

### Receipt

```text
Vendor → Internal Warehouse
```

### Delivery

```text
Internal Warehouse → Customer
```

### Internal transfer

```text
Internal Location A → Internal Location B
```

### Damage adjustment

```text
Internal Warehouse → Inventory Loss
```

### Stock gain adjustment

```text
Inventory Gain → Internal Warehouse
```

Virtual locations must not produce fake physical balances in the dashboard.

## Ledger rules

- Ledger entries are created only for validated stock movements.
- Ledger entries are append-only.
- Completed history must not be edited or deleted.
- Corrections must create a new reversing or adjusting movement.
- Every movement should include product, quantity, source, destination, user, timestamp, and document reference.

## Quantity rules

- Quantities use PostgreSQL `NUMERIC`, not floating-point values.
- Physical stock must not become negative.
- A delivery must not exceed available physical stock.
- Reserved quantity must not exceed total quantity.
- A transfer changes location quantities but not total physical stock.

## Important schema context

The corrected schema includes:

- `citext` and `pg_trgm` extensions.
- Location-aware ledger-to-quant updates.
- Validation for positive quantities.
- Reorder-rule validation.
- Duplicate unresolved-alert protection.
- Append-only ledger mutation rejection.
- A physical-stock view grouped by product and warehouse.

Do not alter the schema unless a future user prompt explicitly requests a schema change.

---

# 7. Frontend design context

The frontend should follow the uploaded StockSense mockup for information architecture and screen relationships.

The visual style is inspired by Odoo Web, with a custom StockSense light-purple identity.

## Color direction

Use a cream-white and light-purple theme.

```text
App cream background:       #F7F5F2
Surface white:              #FFFFFF
Primary light purple:       #A78BFA
Primary purple:             #7C5CFC
Deep purple text:           #4C3A78
Soft purple background:     #F0EBFF
Purple border:              #DDD4FF
Main text:                  #2F2937
Muted text:                 #756F82
Neutral border:             #E8E4EC
Hover background:           #F6F2FF
Input background:           #FCFBFD
Success green:              #2E9B68
Success soft:               #E8F7EF
Warning amber:              #C8841A
Warning soft:               #FFF4D9
Danger red:                 #D95757
Danger soft:                #FDEAEA
Info blue:                  #5577C9
Info soft:                  #EDF2FF
```

## Layout direction

- Desktop-first authenticated web application.
- Persistent left sidebar.
- Compact top header.
- Cream application background.
- White content surfaces.
- Centered main content container.
- Maximum content width approximately 1,360–1,440px.
- Main content should not stretch edge-to-edge on wide screens.
- Cards use subtle borders and soft shadows.
- Avoid dark mode, neon colors, heavy gradients, glassmorphism, and excessive decoration.

## Typography direction

Preferred font order:

```text
Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Use clear sentence case and compact operational typography.

## Main shell

The shell contains:

- StockSense logo and identity.
- Sidebar navigation.
- Top header with breadcrumbs.
- Global search.
- Warehouse selector.
- Notifications.
- User profile.
- Centered content area.

## Navigation

```text
Dashboard
Products
Operations
  Receipts
  Delivery Orders
  Internal Transfers
  Adjustments
Stock Ledger
Risk Center
Reports
Settings
```

## Main screens

The frontend is expected to include these screens when specifically requested:

1. Dashboard.
2. Products list.
3. Product detail.
4. Receipts list and receipt form.
5. Delivery order form.
6. Internal transfer form.
7. Adjustment form.
8. Stock ledger.
9. Risk Center.
10. Inventory assistant drawer.
11. Settings placeholder.

Do not implement or modify these screens until a user prompt explicitly requests it.

---

# 8. Dashboard context

The dashboard is the primary judging screen.

Suggested KPI cards:

- Total stock units.
- Inventory value.
- Critical products.
- Pending operations.
- Unusual movements.

Main dashboard areas:

- Stock health chart.
- AI priority insight panel.
- Products needing attention table.
- Recent stock movements.
- Assistant entry point.

The most important dashboard insight should be specific and explainable:

```text
Steel Rods may run out in 3.3 days.
Average usage is 12 units/day and supplier lead time is 5 days.
Recommended action: reorder 40 units.
```

The dashboard should not display generic AI claims without data support.

---

# 9. Demo scenario

Use a steel manufacturing example.

## Warehouses and locations

```text
Main Warehouse
Production Floor
Dispatch Area
Rack A
Rack B
```

## Products

```text
Steel Rods        STL-001   kg
Wooden Panels     WPN-002   pcs
Industrial Paint  PNT-006   L
Safety Gloves     GLV-004   pairs
Screws            SCR-003   pcs
```

## Partners

```text
Supplier A
Supplier B
Customer Alpha
Customer Beta
```

## Transaction story

```text
1. Receive 100 kg Steel Rods from Supplier A.
2. Transfer 20 kg from Main Warehouse to Production Floor.
3. Deliver 15 kg to Customer Alpha.
4. Adjust 3 kg as damaged.
5. Show the ledger and explain the resulting stock.
6. Display the risk and reorder recommendation.
7. Show the unusual adjustment warning.
8. Ask the assistant why Steel Rods require attention.
```

A transfer changes location but does not change total stock.

For a simple quantity example:

\[
100 - 15 - 3 = 82
\]

If the risk demonstration uses 40 units available, the seeded data and selected location must consistently support that value. Do not show contradictory stock values across screens.

---

# 10. Demo and presentation context

The recommended presentation story is:

## Opening

> Most small businesses do not lose money because they cannot buy inventory. They lose money because they do not know what is actually happening to their inventory.

## Solution

> StockSense records every movement, predicts stockout risk, detects unusual adjustments, recommends reorder quantities, and explains each recommendation in plain language.

## Demonstration sequence

1. Open dashboard.
2. Show critical Steel Rods alert.
3. Receive stock.
4. Transfer stock.
5. Deliver stock.
6. Record damage adjustment.
7. Open ledger.
8. Show risk calculation.
9. Show reorder recommendation.
10. Ask the assistant for an explanation.

## Technical explanation

Mention:

- Event-based stock ledger.
- Fast current balances.
- Location-aware stock movement.
- Explainable risk engine.
- Reorder formula.
- Rule-based anomaly detection.
- Human-approved recommendations.

Do not claim:

- 100% prediction accuracy.
- Complete ERP functionality.
- Automatic fraud detection.
- That the product eliminates all stockouts.
- That a model was trained if the prototype uses rules and formulas.

---

# 11. Development principles

When a future prompt requests implementation, follow these principles:

## Preserve existing behavior

Do not rewrite working modules unless the user asks for a rewrite or the change is necessary for the requested task.

## Prefer small, reviewable changes

Implement one requested feature at a time.

## Do not silently expand scope

Do not add authentication, payments, AI providers, cloud infrastructure, or unrelated features unless explicitly requested.

## Keep the stock engine reliable

Inventory writes must be transactional, validated, and auditable.

## Keep intelligence explainable

Every recommendation should be traceable to current stock, usage, lead time, safety stock, or documented rules.

## Do not hide errors

Show useful user-facing messages for:

- Insufficient stock.
- Invalid quantities.
- Invalid location combinations.
- Duplicate validation.
- Failed data loading.

## Do not use destructive operations without permission

Do not delete files, tables, records, branches, or repositories unless explicitly asked.

## Do not make external changes without a clear prompt

Do not commit, push, deploy, create pull requests, or modify connected services without explicit instruction.

---

# 12. Hackathon implementation priority

If a future prompt asks for an 8-hour MVP, use this priority order:

## Priority A: Must work

- Dashboard.
- Product data.
- Receive stock.
- Deliver stock.
- Transfer stock.
- Adjust stock.
- Stock ledger.

## Priority B: Main differentiator

- Days of cover.
- Reorder recommendation.
- Anomaly alert.
- Explainable insight.

## Priority C: Polish

- Charts.
- Filters.
- Assistant drawer.
- Responsive behavior.
- Empty and error states.
- Deployment polish.

Do not sacrifice correct stock movement logic for decorative UI.

---

# 13. Acceptance standard for future implementation prompts

Before considering a requested feature complete, verify:

- The requested behavior works end-to-end.
- Existing StockSense navigation remains coherent.
- Stock quantities remain mathematically consistent.
- Virtual locations do not distort physical stock.
- Completed ledger entries remain immutable.
- Errors are understandable.
- The design remains centered and visually consistent.
- The light-purple and cream-white theme is preserved.
- No unrelated features were introduced.
- No implementation action was taken without an explicit user request.

---

# Final instruction to Antigravity

This file is project context only.

Read it, understand it, and wait.

Do not make any changes until the user sends a separate implementation prompt with a clearly requested task.
