-- ── 025: Workflow simplification — add missing status values ──

-- 1. Add missing item_status values for simplified workflow
ALTER TYPE public.item_status ADD VALUE IF NOT EXISTS 'submitted';
ALTER TYPE public.item_status ADD VALUE IF NOT EXISTS 'completed';

-- 2. Add transport_cost to deliveries if not present
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS transport_cost NUMERIC(14,2);

COMMENT ON COLUMN public.deliveries.transport_cost IS 'Transport/shipping cost for this delivery.';

-- 3. Add payment_type to payments for installment tracking
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'full_payment'
    CHECK (payment_type IN ('full_payment', 'installment', 'advance', 'on_delivery'));

COMMENT ON COLUMN public.payments.payment_type IS 'Type of payment: full_payment, installment, advance, or on_delivery.';

-- 4. Add approval_status to payments (separate from processing status)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));

COMMENT ON COLUMN public.payments.approval_status IS 'Approval status — all payments require approval before processing.';
