BEGIN;

ALTER TABLE reorder_rules
  ADD COLUMN lead_time_days NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN safety_stock_qty NUMERIC(18,3) NOT NULL DEFAULT 0;

ALTER TABLE reorder_rules
  ADD CONSTRAINT chk_lead_time_non_negative CHECK (lead_time_days >= 0);

ALTER TABLE reorder_rules
  ADD CONSTRAINT chk_safety_stock_non_negative CHECK (safety_stock_qty >= 0);

COMMIT;
