-- ── 017: Requirement extensions + approver PO RLS fix + notification insert ──
-- Run this in Supabase SQL Editor

-- 1. New columns on requirements
ALTER TABLE public.requirements
  ADD COLUMN IF NOT EXISTS preferred_vendor_id      UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reason                   TEXT,
  ADD COLUMN IF NOT EXISTS requested_on_behalf_of   TEXT,
  ADD COLUMN IF NOT EXISTS vendor_confirmed         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vendor_confirmation_note TEXT,
  ADD COLUMN IF NOT EXISTS inventory_pin_id         UUID REFERENCES public.inventory_pins(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.requirements.preferred_vendor_id      IS 'Optional preferred vendor. NULL = Any vendor.';
COMMENT ON COLUMN public.requirements.reason                   IS 'Business justification / reason for this requirement.';
COMMENT ON COLUMN public.requirements.requested_on_behalf_of   IS 'Who verbally asked for this item (if not the requester themselves).';
COMMENT ON COLUMN public.requirements.vendor_confirmed         IS 'True after procurement confirmed vendor outside the system.';
COMMENT ON COLUMN public.requirements.vendor_confirmation_note IS 'Notes from the vendor confirmation conversation.';
COMMENT ON COLUMN public.requirements.inventory_pin_id         IS 'Link to an existing inventory PIN if the item is already in stock.';

CREATE INDEX IF NOT EXISTS idx_requirements_preferred_vendor ON public.requirements(preferred_vendor_id);
CREATE INDEX IF NOT EXISTS idx_requirements_inventory_pin    ON public.requirements(inventory_pin_id);

-- 2. Fix purchase_orders RLS: allow approver role to create and update POs
DO $$
BEGIN
  DROP POLICY IF EXISTS purchase_orders_insert_procurement_admin ON public.purchase_orders;
  CREATE POLICY purchase_orders_insert_procurement_admin
    ON public.purchase_orders FOR INSERT
    WITH CHECK (
      public.is_procurement()
      OR public.is_admin()
      OR public.auth_role() = 'approver'
    );

  DROP POLICY IF EXISTS purchase_orders_update_own_draft_or_privileged ON public.purchase_orders;
  CREATE POLICY purchase_orders_update_own_draft_or_privileged
    ON public.purchase_orders FOR UPDATE
    USING (
      (created_by = auth.uid() AND status = 'draft')
      OR public.is_admin()
      OR public.auth_role() = 'procurement_manager'
      OR public.auth_role() = 'approver'
    )
    WITH CHECK (
      (created_by = auth.uid() AND status = 'draft')
      OR public.is_admin()
      OR public.auth_role() = 'procurement_manager'
      OR public.auth_role() = 'approver'
    );
EXCEPTION WHEN OTHERS THEN
  NULL; -- ignore if policies don't match exactly (names may vary)
END;
$$;

-- 3. Allow server-side admin client to insert notifications (service role bypasses RLS)
--    This policy is a belt-and-suspenders for authenticated server inserts.
DROP POLICY IF EXISTS notifications_insert_authenticated ON public.notifications;
CREATE POLICY notifications_insert_authenticated
  ON public.notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR public.is_admin());
