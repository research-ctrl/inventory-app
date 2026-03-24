-- ============================================================
-- 033_purchase_flow_redesign.sql
-- Links po_items back to inventory_pins (price history)
-- Adds rejection_reason to purchase_orders if not present
-- ============================================================

-- Link PO items to inventory PINs for price history lookup
ALTER TABLE public.po_items
  ADD COLUMN IF NOT EXISTS inventory_pin_id UUID
    REFERENCES public.inventory_pins(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_po_items_inventory_pin_id
  ON public.po_items(inventory_pin_id);

-- Ensure purchase_orders has requirement_id link
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS requirement_id UUID
    REFERENCES public.requirements(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_requirement_id
  ON public.purchase_orders(requirement_id);
