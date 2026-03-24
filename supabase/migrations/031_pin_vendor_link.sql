-- ============================================================
-- 031_pin_vendor_link.sql
-- Link inventory PINs to vendors and fix vendor fetching logic.
-- ============================================================

-- 1. Add vendor_id to inventory_pins
ALTER TABLE public.inventory_pins
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_pins_vendor_id ON public.inventory_pins(vendor_id);

-- 2. Update v_inventory_status view to include vendor name
DROP VIEW IF EXISTS public.v_stock_balance CASCADE;
DROP VIEW IF EXISTS public.v_inventory_status CASCADE;

CREATE OR REPLACE VIEW public.v_inventory_status AS
SELECT
  ip.id                                     AS pin_id,
  ip.pin_number,
  ip.description,
  ip.part_number,
  ip.unit,
  ip.category,
  sl.code                                   AS location_code,
  sl.name                                   AS location_name,
  v.name                                    AS vendor_name,
  v.id                                      AS vendor_id,
  -- running balance from signed transactions
  COALESCE(
    SUM(
      CASE it.transaction_type
        WHEN 'receipt'    THEN  it.quantity
        WHEN 'return'     THEN  it.quantity
        WHEN 'adjustment' THEN  it.quantity
        WHEN 'issue'      THEN -it.quantity
        WHEN 'transfer'   THEN -it.quantity
        WHEN 'write_off'  THEN -it.quantity
        WHEN 'reversal'   THEN  it.quantity
        ELSE 0
      END
    ), 0
  )                                         AS current_stock,
  -- simple low-stock flag (0 or less)
  (
    COALESCE(
      SUM(
        CASE it.transaction_type
          WHEN 'receipt'    THEN  it.quantity
          WHEN 'return'     THEN  it.quantity
          WHEN 'adjustment' THEN  it.quantity
          WHEN 'issue'      THEN -it.quantity
          WHEN 'transfer'   THEN -it.quantity
          WHEN 'write_off'  THEN -it.quantity
          WHEN 'reversal'   THEN  it.quantity
          ELSE 0
        END
      ), 0
    ) <= 0
  )                                         AS is_low_stock,
  ip.status,
  ip.created_at
FROM public.inventory_pins            ip
LEFT JOIN public.store_locations       sl ON sl.id = ip.location_id
LEFT JOIN public.vendors               v  ON v.id  = ip.vendor_id
LEFT JOIN public.inventory_transactions it ON it.pin_id = ip.id
GROUP BY ip.id, ip.pin_number, ip.description, ip.part_number, ip.unit, ip.category, sl.code, sl.name, v.id, v.name;

-- 3. Restore v_stock_balance (commonly used in the app)
CREATE OR REPLACE VIEW public.v_stock_balance AS
SELECT * FROM public.v_inventory_status;
