-- ============================================================
-- 032_fix_stock_view.sql
-- Fix v_stock_balance / v_inventory_status double-negation bug.
--
-- Migration 031 introduced CASE WHEN 'issue' THEN -it.quantity,
-- but issue transactions are ALREADY stored as negative quantities.
-- That caused -(-qty) = +qty → stock INCREASED on every release.
--
-- Fix: use SUM(it.quantity) directly — the sign is in the data.
-- ============================================================

DROP VIEW IF EXISTS public.v_stock_balance    CASCADE;
DROP VIEW IF EXISTS public.v_inventory_status CASCADE;

-- Primary view used everywhere in the app
CREATE OR REPLACE VIEW public.v_inventory_status AS
SELECT
  ip.id                               AS pin_id,
  ip.pin_number,
  ip.description,
  ip.part_number,
  ip.unit,
  ip.category,
  sl.code                             AS location_code,
  sl.name                             AS location_name,
  v.name                              AS vendor_name,
  v.id                                AS vendor_id,
  ip.location_id,
  -- Transactions store SIGNED quantities:
  --   receipt / return / adjustment  → positive
  --   issue / write_off              → negative
  -- Just SUM them — DO NOT negate again.
  COALESCE(SUM(it.quantity), 0)       AS current_stock,
  (COALESCE(SUM(it.quantity), 0) <= 0) AS is_low_stock,
  ip.min_stock_level,
  ip.max_stock_level,
  ip.status,
  ip.parent_pin_id,
  ip.origin_type,
  ip.origin_reference,
  ip.created_at
FROM public.inventory_pins            ip
LEFT JOIN public.store_locations      sl ON sl.id  = ip.location_id
LEFT JOIN public.vendors              v  ON v.id   = ip.vendor_id
LEFT JOIN public.inventory_transactions it ON it.pin_id = ip.id
GROUP BY
  ip.id, ip.pin_number, ip.description, ip.part_number, ip.unit,
  ip.category, ip.location_id, sl.code, sl.name, v.id, v.name,
  ip.min_stock_level, ip.max_stock_level, ip.status, ip.parent_pin_id,
  ip.origin_type, ip.origin_reference, ip.created_at;

-- v_stock_balance is an alias used in search + inventory page
CREATE OR REPLACE VIEW public.v_stock_balance AS
SELECT * FROM public.v_inventory_status;
