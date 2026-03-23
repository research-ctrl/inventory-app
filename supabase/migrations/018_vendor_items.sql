-- ── 018: Vendor catalog items ──
-- Stores items/products that each vendor supplies, with pricing, lead time, transport cost.

CREATE TABLE IF NOT EXISTS public.vendor_items (
  id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id           UUID          NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  description         TEXT          NOT NULL,
  part_number         TEXT,
  vendor_part_number  TEXT,
  category            TEXT,
  unit                TEXT          NOT NULL DEFAULT 'EA',
  unit_price          NUMERIC(14,4) NOT NULL DEFAULT 0,
  currency            CHAR(3)       NOT NULL DEFAULT 'USD',
  lead_time_days      INT,
  transport_cost      NUMERIC(14,2),
  min_order_qty       NUMERIC(12,3),
  notes               TEXT,
  is_active           BOOLEAN       NOT NULL DEFAULT true,
  created_by          UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.vendor_items IS 'Items/products each vendor supplies, with pricing and logistics details.';

CREATE TRIGGER trg_vendor_items_updated_at
  BEFORE UPDATE ON public.vendor_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_vendor_items_vendor      ON public.vendor_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_items_part_number ON public.vendor_items(part_number) WHERE part_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_items_active      ON public.vendor_items(is_active);
CREATE INDEX IF NOT EXISTS idx_vendor_items_description ON public.vendor_items USING gin(to_tsvector('english', description));

ALTER TABLE public.vendor_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY vendor_items_select
  ON public.vendor_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY vendor_items_insert
  ON public.vendor_items FOR INSERT
  WITH CHECK (public.is_procurement() OR public.is_admin() OR public.auth_role() = 'approver');

CREATE POLICY vendor_items_update
  ON public.vendor_items FOR UPDATE
  USING  (public.is_procurement() OR public.is_admin() OR public.auth_role() = 'approver')
  WITH CHECK (public.is_procurement() OR public.is_admin() OR public.auth_role() = 'approver');

CREATE POLICY vendor_items_delete
  ON public.vendor_items FOR DELETE
  USING (public.is_admin());
