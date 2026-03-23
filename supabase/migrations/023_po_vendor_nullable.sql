-- ── 023: Make purchase_orders.vendor_id nullable ──
-- Allows auto-creating a draft PO from an approved requirement even when
-- no preferred vendor has been set yet. The procurement team fills this in.

ALTER TABLE public.purchase_orders
  ALTER COLUMN vendor_id DROP NOT NULL;

COMMENT ON COLUMN public.purchase_orders.vendor_id
  IS 'Vendor for this PO. NULL means TBD — must be set before PO can be submitted for approval.';
