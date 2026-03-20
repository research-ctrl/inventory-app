-- ============================================================
-- 005_delivery_receiving.sql
-- Delivery receiving tables for the Shipyard Material
-- Lifecycle System.
--
-- Depends on: 002_core.sql, 003_requirements.sql,
--             004_approvals_procurement.sql
-- Note: receiving_location_id FK to store_locations is added
--       in 006_qc_inventory.sql after that table is created.
-- ============================================================

-- ============================================================
-- PO LINE ITEMS
-- Add fields to po_items (table created in 004) to support
-- delivery tracking.
-- ============================================================

ALTER TABLE public.po_items
  ADD COLUMN quantity_received NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TRIGGER trg_po_items_updated_at
  BEFORE UPDATE ON public.po_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- DELIVERIES
-- ============================================================

CREATE TABLE public.deliveries (
  id                      UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_ref            TEXT              UNIQUE NOT NULL DEFAULT '',
  po_id                   UUID              NOT NULL REFERENCES public.purchase_orders(id),
  status                  public.item_status NOT NULL DEFAULT 'pending_approval',
  supplier_delivery_note  TEXT,
  tracking_number         TEXT,
  carrier                 TEXT,
  expected_date           DATE,
  actual_received_date    TIMESTAMPTZ,
  received_by             UUID              REFERENCES public.profiles(id),
  -- FK to store_locations added in 006_qc_inventory.sql
  receiving_location_id   UUID,
  notes                   TEXT,
  created_at              TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ       NOT NULL DEFAULT now()
);

-- ============================================================
-- TRIGGER: auto-assign delivery_ref on INSERT
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_set_delivery_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.delivery_ref = '' OR NEW.delivery_ref IS NULL THEN
    NEW.delivery_ref := public.next_ref('delivery', 'DLV');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deliveries_ref
  BEFORE INSERT ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_delivery_ref();

CREATE TRIGGER trg_deliveries_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- DELIVERY ITEMS
-- ============================================================

CREATE TABLE public.delivery_items (
  id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id         UUID          NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  po_item_id          UUID          REFERENCES public.po_items(id),
  line_number         INT           NOT NULL,
  description         TEXT          NOT NULL,
  part_number         TEXT,
  quantity_expected   NUMERIC(12,3) NOT NULL,
  quantity_received   NUMERIC(12,3) NOT NULL DEFAULT 0
                        CHECK (quantity_received >= 0),
  unit                TEXT          NOT NULL,
  condition_notes     TEXT,
  is_partial          BOOLEAN       GENERATED ALWAYS AS
                        (quantity_received < quantity_expected) STORED,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT uq_delivery_items_line UNIQUE (delivery_id, line_number)
);

CREATE TRIGGER trg_delivery_items_updated_at
  BEFORE UPDATE ON public.delivery_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_deliveries_po_id
  ON public.deliveries (po_id);

CREATE INDEX idx_deliveries_status
  ON public.deliveries (status);

CREATE INDEX idx_deliveries_received_by
  ON public.deliveries (received_by);

CREATE INDEX idx_delivery_items_delivery_id
  ON public.delivery_items (delivery_id);

CREATE INDEX idx_delivery_items_po_item_id
  ON public.delivery_items (po_item_id);
