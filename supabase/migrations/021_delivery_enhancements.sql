-- ── 021: Delivery lifecycle improvements + vendor confirmation on POs ──
-- NOTE: ALTER TYPE ADD VALUE cannot run inside a transaction in PostgreSQL.
-- Run each ALTER TYPE statement separately if you get a "cannot run inside a transaction block" error.

-- 1. Add delivery-specific status values to item_status enum
ALTER TYPE public.item_status ADD VALUE IF NOT EXISTS 'in_transit';
ALTER TYPE public.item_status ADD VALUE IF NOT EXISTS 'arriving_today';
ALTER TYPE public.item_status ADD VALUE IF NOT EXISTS 'delayed';
ALTER TYPE public.item_status ADD VALUE IF NOT EXISTS 'order_placed';

-- 2. Vendor confirmation tracking on purchase orders
--    (Procurement Manager can log that they confirmed vendor details offline)
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS vendor_confirmed         BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vendor_confirmation_note TEXT,
  ADD COLUMN IF NOT EXISTS vendor_confirmed_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendor_confirmed_at      TIMESTAMPTZ;

COMMENT ON COLUMN public.purchase_orders.vendor_confirmed         IS 'True after vendor acknowledged the PO (call/email confirmation logged).';
COMMENT ON COLUMN public.purchase_orders.vendor_confirmation_note IS 'Notes from the vendor confirmation (call reference, who spoke to, etc).';

-- 3. Enhanced delivery tracking fields
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS dispatched_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_arrival DATE,
  ADD COLUMN IF NOT EXISTS delay_reason      TEXT;

COMMENT ON COLUMN public.deliveries.dispatched_at     IS 'When vendor dispatched / shipped the goods.';
COMMENT ON COLUMN public.deliveries.estimated_arrival IS 'Latest estimated arrival date (updated as delivery progresses).';
COMMENT ON COLUMN public.deliveries.delay_reason      IS 'Reason for delay when status = delayed.';
