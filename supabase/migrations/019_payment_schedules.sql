-- ── 019: Payment schedules + installment support + payment approval ──

-- 1. Enhance existing payments table
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS schedule_id       UUID,
  ADD COLUMN IF NOT EXISTS installment_no    INT,
  ADD COLUMN IF NOT EXISTS due_date          DATE,
  ADD COLUMN IF NOT EXISTS approved_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason  TEXT,
  ADD COLUMN IF NOT EXISTS created_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.payments.schedule_id    IS 'Links to a payment_schedule if this is an installment.';
COMMENT ON COLUMN public.payments.installment_no IS 'Installment number (1-based) within the schedule.';
COMMENT ON COLUMN public.payments.due_date       IS 'When this payment is due.';
COMMENT ON COLUMN public.payments.approved_by    IS 'Who approved this payment.';

-- 2. New payment_schedules table
CREATE TABLE IF NOT EXISTS public.payment_schedules (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id           UUID          NOT NULL REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  schedule_type   TEXT          NOT NULL DEFAULT 'single'
                    CHECK (schedule_type IN ('single', 'installment', 'milestone')),
  total_amount    NUMERIC(14,2) NOT NULL,
  currency        CHAR(3)       NOT NULL DEFAULT 'USD',
  notes           TEXT,
  created_by      UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payment_schedules IS 'Payment plan for a PO — single full payment, installments, or milestone-based.';

CREATE TRIGGER trg_payment_schedules_updated_at
  BEFORE UPDATE ON public.payment_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_payment_schedules_po ON public.payment_schedules(po_id);

-- 3. Add FK from payments.schedule_id to payment_schedules
ALTER TABLE public.payments
  ADD CONSTRAINT fk_payments_schedule
  FOREIGN KEY (schedule_id) REFERENCES public.payment_schedules(id) ON DELETE SET NULL;

-- 4. RLS for payment_schedules
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY paysched_select
  ON public.payment_schedules FOR SELECT
  USING (public.is_finance() OR public.is_admin() OR public.auth_role() = 'procurement_manager'
         OR public.auth_role() = 'approver');

CREATE POLICY paysched_insert
  ON public.payment_schedules FOR INSERT
  WITH CHECK (public.is_finance() OR public.is_admin() OR public.auth_role() = 'procurement_manager'
              OR public.auth_role() = 'approver');

CREATE POLICY paysched_update
  ON public.payment_schedules FOR UPDATE
  USING  (public.is_finance() OR public.is_admin())
  WITH CHECK (public.is_finance() OR public.is_admin());

CREATE POLICY paysched_delete
  ON public.payment_schedules FOR DELETE
  USING (public.is_admin());

-- 5. Seed system setting for payment approval requirement
INSERT INTO public.system_settings (key, value, description)
  VALUES ('payment_approval_required', 'true', 'When true, all payments require approval before processing')
ON CONFLICT (key) DO NOTHING;
