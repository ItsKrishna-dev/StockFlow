-- =====================================================================
-- StockSense — PostgreSQL MVP Schema (v2: corrected + extended)
-- Base authored by team; this revision adds document numbering,
-- adjustment reasons, and refresh-token support for JWT revocation.
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================================
-- 1. AUTH & USERS
-- =====================================================================

CREATE TYPE user_role AS ENUM (
  'admin',
  'inventory_manager',
  'warehouse_staff'
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  role user_role NOT NULL DEFAULT 'warehouse_staff',
  phone VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role
  ON users(role)
  WHERE is_active = TRUE;

CREATE TABLE otp_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_code VARCHAR(10) NOT NULL,
  purpose VARCHAR(30) NOT NULL DEFAULT 'password_reset',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_otp_expiry CHECK (expires_at > created_at)
);

CREATE INDEX idx_otp_user_active
  ON otp_tokens(user_id)
  WHERE used_at IS NULL;

-- NEW: refresh tokens so logout / password-reset can revoke sessions.
-- Access tokens stay short-lived and stateless; only refresh tokens
-- are tracked, keeping the hot path (every request) DB-free.
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_refresh_expiry CHECK (expires_at > created_at)
);

CREATE INDEX idx_refresh_active
  ON refresh_tokens(user_id)
  WHERE revoked_at IS NULL;

-- =====================================================================
-- 2. WAREHOUSES & LOCATIONS
-- =====================================================================

CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(120) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE location_type AS ENUM (
  'internal',
  'vendor',
  'customer',
  'virtual_adjustment'
);

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE RESTRICT,
  parent_location_id UUID REFERENCES locations(id) ON DELETE RESTRICT,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(30) NOT NULL UNIQUE,
  type location_type NOT NULL DEFAULT 'internal',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_internal_location_has_warehouse CHECK (
    type <> 'internal' OR warehouse_id IS NOT NULL
  ),
  CONSTRAINT chk_virtual_location_has_no_warehouse CHECK (
    type = 'internal' OR warehouse_id IS NULL
  )
);

CREATE INDEX idx_locations_warehouse ON locations(warehouse_id);
CREATE INDEX idx_locations_parent ON locations(parent_location_id);
CREATE INDEX idx_locations_type ON locations(type);

-- =====================================================================
-- 3. PRODUCTS
-- =====================================================================

CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(120) NOT NULL,
  parent_id UUID REFERENCES product_categories(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE units_of_measure (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE,
  uom_category VARCHAR(30) NOT NULL,
  ratio_to_base NUMERIC(18,6) NOT NULL DEFAULT 1,
  CONSTRAINT chk_uom_ratio_positive CHECK (ratio_to_base > 0)
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES product_categories(id) ON DELETE RESTRICT,
  uom_id UUID NOT NULL REFERENCES units_of_measure(id) ON DELETE RESTRICT,
  barcode VARCHAR(64) UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);

CREATE TABLE reorder_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  min_qty NUMERIC(18,3) NOT NULL,
  max_qty NUMERIC(18,3) NOT NULL,
  reorder_qty NUMERIC(18,3) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(product_id, warehouse_id),
  CONSTRAINT chk_reorder_min_non_negative CHECK (min_qty >= 0),
  CONSTRAINT chk_reorder_max_valid CHECK (max_qty >= min_qty),
  CONSTRAINT chk_reorder_qty_positive CHECK (reorder_qty > 0)
);

-- =====================================================================
-- 4. PARTNERS
-- =====================================================================

CREATE TYPE partner_type AS ENUM ('vendor', 'customer', 'both');

CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  type partner_type NOT NULL,
  email CITEXT,
  phone VARCHAR(20),
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 5. STOCK QUANTS
-- =====================================================================

CREATE TABLE stock_quants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  quantity NUMERIC(18,3) NOT NULL DEFAULT 0,
  reserved_qty NUMERIC(18,3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, location_id),
  CONSTRAINT chk_quant_quantity_non_negative CHECK (quantity >= 0),
  CONSTRAINT chk_quant_reserved_non_negative CHECK (reserved_qty >= 0),
  CONSTRAINT chk_reserved_le_quantity CHECK (reserved_qty <= quantity)
);

CREATE INDEX idx_quants_product ON stock_quants(product_id);
CREATE INDEX idx_quants_location ON stock_quants(location_id);
CREATE INDEX idx_quants_low_stock ON stock_quants(product_id, quantity);

-- =====================================================================
-- 6. DOCUMENTS
-- =====================================================================

CREATE TYPE document_type AS ENUM (
  'receipt',
  'delivery',
  'internal_transfer',
  'adjustment'
);

CREATE TYPE document_status AS ENUM (
  'draft',
  'waiting',
  'ready',
  'done',
  'canceled'
);

CREATE TABLE stock_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_number VARCHAR(30) NOT NULL UNIQUE,
  type document_type NOT NULL,
  status document_status NOT NULL DEFAULT 'draft',
  partner_id UUID REFERENCES partners(id) ON DELETE RESTRICT,
  source_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  dest_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE RESTRICT,
  scheduled_date TIMESTAMPTZ,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  validated_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_different_locations CHECK (
    source_location_id <> dest_location_id
  ),
  CONSTRAINT chk_done_validation_metadata CHECK (
    (status = 'done' AND validated_by IS NOT NULL AND validated_at IS NOT NULL)
    OR
    (status <> 'done' AND validated_by IS NULL AND validated_at IS NULL)
  )
);

CREATE INDEX idx_documents_status ON stock_documents(status);
CREATE INDEX idx_documents_type_status ON stock_documents(type, status);
CREATE INDEX idx_documents_warehouse ON stock_documents(warehouse_id);
CREATE INDEX idx_documents_created_at ON stock_documents(created_at DESC);

CREATE TABLE stock_document_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES stock_documents(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  uom_id UUID NOT NULL REFERENCES units_of_measure(id) ON DELETE RESTRICT,
  quantity_expected NUMERIC(18,3) NOT NULL,
  quantity_done NUMERIC(18,3) NOT NULL DEFAULT 0,
  -- NEW: required for adjustments (and useful notes for any line),
  -- enforced at the app layer for type='adjustment' documents.
  reason TEXT,
  CONSTRAINT chk_qty_expected_positive CHECK (quantity_expected > 0),
  CONSTRAINT chk_qty_done_non_negative CHECK (quantity_done >= 0),
  CONSTRAINT chk_qty_done_not_over_expected CHECK (
    quantity_done <= quantity_expected
  )
);

CREATE INDEX idx_doc_lines_document ON stock_document_lines(document_id);
CREATE INDEX idx_doc_lines_product ON stock_document_lines(product_id);

-- NEW: auto-generate human-readable document numbers per type
-- (RCPT-000001, DELV-000001, TRF-000001, ADJ-000001) so the app never
-- has to compute or race on numbering.
CREATE SEQUENCE seq_doc_receipt START 1;
CREATE SEQUENCE seq_doc_delivery START 1;
CREATE SEQUENCE seq_doc_transfer START 1;
CREATE SEQUENCE seq_doc_adjustment START 1;

CREATE OR REPLACE FUNCTION fn_generate_document_number()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  next_val BIGINT;
BEGIN
  IF NEW.document_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  CASE NEW.type
    WHEN 'receipt' THEN
      prefix := 'RCPT';
      next_val := nextval('seq_doc_receipt');
    WHEN 'delivery' THEN
      prefix := 'DELV';
      next_val := nextval('seq_doc_delivery');
    WHEN 'internal_transfer' THEN
      prefix := 'TRF';
      next_val := nextval('seq_doc_transfer');
    WHEN 'adjustment' THEN
      prefix := 'ADJ';
      next_val := nextval('seq_doc_adjustment');
  END CASE;

  NEW.document_number := prefix || '-' || lpad(next_val::text, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_document_number
BEFORE INSERT ON stock_documents
FOR EACH ROW
EXECUTE FUNCTION fn_generate_document_number();

-- =====================================================================
-- 7. APPEND-ONLY STOCK LEDGER
-- =====================================================================

CREATE TABLE stock_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_line_id UUID NOT NULL REFERENCES stock_document_lines(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  source_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  dest_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  quantity NUMERIC(18,3) NOT NULL,
  source_qty_after NUMERIC(18,3),
  dest_qty_after NUMERIC(18,3),
  performed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_ledger_quantity_positive CHECK (quantity > 0),
  CONSTRAINT chk_ledger_locations_different CHECK (
    source_location_id <> dest_location_id
  )
);

CREATE INDEX idx_ledger_product_date ON stock_ledger(product_id, created_at DESC);
CREATE INDEX idx_ledger_document_line ON stock_ledger(document_line_id);

-- MVP LIMITATION (kept intentionally, documented so we don't forget):
-- one validated movement per document line means a line cannot be
-- partially validated twice. Fine for receipts/deliveries validated
-- in a single "Validate" click. If partial multi-step receiving is
-- added later, replace this with a per-movement allocation table
-- instead of relaxing this constraint.
CREATE UNIQUE INDEX uq_ledger_one_movement_per_line
  ON stock_ledger(document_line_id);

-- =====================================================================
-- 8. STOCK ALERTS
-- =====================================================================

CREATE TABLE stock_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  alert_type VARCHAR(20) NOT NULL DEFAULT 'low_stock',
  current_qty NUMERIC(18,3) NOT NULL,
  threshold_qty NUMERIC(18,3) NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT chk_alert_type CHECK (
    alert_type IN ('low_stock', 'out_of_stock', 'stockout_risk', 'anomaly')
  ),
  CONSTRAINT chk_alert_current_non_negative CHECK (current_qty >= 0),
  CONSTRAINT chk_alert_threshold_non_negative CHECK (threshold_qty >= 0),
  CONSTRAINT chk_alert_resolution_consistency CHECK (
    (is_resolved = FALSE AND resolved_at IS NULL)
    OR
    (is_resolved = TRUE AND resolved_at IS NOT NULL)
  )
);

CREATE INDEX idx_alerts_unresolved
  ON stock_alerts(product_id, warehouse_id)
  WHERE is_resolved = FALSE;

CREATE UNIQUE INDEX uq_active_stock_alert
  ON stock_alerts(product_id, warehouse_id, alert_type)
  WHERE is_resolved = FALSE;

-- =====================================================================
-- 9. LOCATION-AWARE QUANT UPDATE
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_apply_ledger_to_quants()
RETURNS TRIGGER AS $$
DECLARE
  source_type location_type;
  dest_type location_type;
  source_balance NUMERIC(18,3);
  dest_balance NUMERIC(18,3);
BEGIN
  SELECT type INTO source_type FROM locations WHERE id = NEW.source_location_id;
  SELECT type INTO dest_type FROM locations WHERE id = NEW.dest_location_id;

  IF source_type IS NULL OR dest_type IS NULL THEN
    RAISE EXCEPTION 'Ledger locations do not exist';
  END IF;

  IF source_type = 'internal' THEN
    SELECT quantity INTO source_balance
    FROM stock_quants
    WHERE product_id = NEW.product_id AND location_id = NEW.source_location_id
    FOR UPDATE;

    IF COALESCE(source_balance, 0) < NEW.quantity THEN
      RAISE EXCEPTION
        'Insufficient stock for product %: available %, requested %',
        NEW.product_id, COALESCE(source_balance, 0), NEW.quantity;
    END IF;

    INSERT INTO stock_quants (product_id, location_id, quantity)
    VALUES (NEW.product_id, NEW.source_location_id, 0)
    ON CONFLICT (product_id, location_id) DO NOTHING;

    UPDATE stock_quants
    SET quantity = quantity - NEW.quantity, updated_at = now()
    WHERE product_id = NEW.product_id AND location_id = NEW.source_location_id
    RETURNING quantity INTO source_balance;
  END IF;

  IF dest_type = 'internal' THEN
    INSERT INTO stock_quants (product_id, location_id, quantity)
    VALUES (NEW.product_id, NEW.dest_location_id, NEW.quantity)
    ON CONFLICT (product_id, location_id)
    DO UPDATE SET
      quantity = stock_quants.quantity + EXCLUDED.quantity,
      updated_at = now()
    RETURNING quantity INTO dest_balance;
  END IF;

  NEW.source_qty_after := source_balance;
  NEW.dest_qty_after := dest_balance;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledger_updates_quants
BEFORE INSERT ON stock_ledger
FOR EACH ROW
EXECUTE FUNCTION fn_apply_ledger_to_quants();

-- =====================================================================
-- 10. APPEND-ONLY PROTECTION
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_reject_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'stock_ledger is append-only; create a correcting movement instead';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledger_no_update
BEFORE UPDATE ON stock_ledger
FOR EACH ROW
EXECUTE FUNCTION fn_reject_ledger_mutation();

CREATE TRIGGER trg_ledger_no_delete
BEFORE DELETE ON stock_ledger
FOR EACH ROW
EXECUTE FUNCTION fn_reject_ledger_mutation();

-- =====================================================================
-- 11. UPDATED-AT TRIGGERS
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_touch
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

CREATE TRIGGER trg_products_touch
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

CREATE TRIGGER trg_documents_touch
BEFORE UPDATE ON stock_documents
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

-- =====================================================================
-- 12. PHYSICAL STOCK VIEW
-- =====================================================================

CREATE VIEW v_product_warehouse_stock AS
SELECT
  sq.product_id,
  l.warehouse_id,
  SUM(sq.quantity) AS physical_qty,
  SUM(sq.reserved_qty) AS reserved_qty,
  SUM(sq.quantity - sq.reserved_qty) AS available_qty
FROM stock_quants sq
JOIN locations l ON l.id = sq.location_id
WHERE l.type = 'internal'
GROUP BY sq.product_id, l.warehouse_id;

COMMIT;

-- =====================================================================
-- 13. APPLICATION ROLE PERMISSIONS (defense in depth) — run separately
-- after deployment against your actual app role name.
-- =====================================================================
-- REVOKE UPDATE, DELETE ON stock_ledger FROM stocksense_app;
-- GRANT SELECT, INSERT ON stock_ledger TO stocksense_app;
-- GRANT SELECT, INSERT, UPDATE ON
--   users, refresh_tokens, warehouses, locations, product_categories,
--   units_of_measure, products, reorder_rules, partners, stock_quants,
--   stock_documents, stock_document_lines, stock_alerts, otp_tokens
--   TO stocksense_app;
