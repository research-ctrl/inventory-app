-- ============================================================
-- 006_qc_inventory.sql
-- Store locations, QC inspections, inventory PINs, and
-- inventory transactions for the Shipyard Material Lifecycle
-- System.
--
-- Depends on: 002_core.sql, 005_delivery_receiving.sql
-- ============================================================

-- ============================================================
-- STORE LOCATIONS
-- ============================================================

CREATE TABLE public.store_locations (
  id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  code         TEXT          UNIQUE NOT NULL,   -- e.g. 'WH-A-01-02'
  name         TEXT          NOT NULL,
  warehouse    TEXT          NOT NULL,          -- e.g. 'Main Warehouse', 'Yard Store'
  zone         TEXT,                            -- e.g. 'A', 'B', 'Cold'
  aisle        TEXT,
  rack         TEXT,
  bin          TEXT,
  capacity_kg  NUMERIC(10,2),
  is_active    BOOLEAN       NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================
-- Back-fill FK: deliveries.receiving_location_id → store_locations
-- (column was added in 005 without FK; now we add the constraint)
-- ============================================================

ALTER TABLE public.deliveries
  ADD CONSTRAINT fk_deliveries_location
  FOREIGN KEY (receiving_location_id)
  REFERENCES public.store_locations(id);

-- ============================================================
-- QC INSPECTIONS
-- ============================================================

CREATE TABLE public.qc_inspections (
  id               UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_ref   TEXT               UNIQUE NOT NULL DEFAULT '',
  delivery_id      UUID               NOT NULL REFERENCES public.deliveries(id),
  delivery_item_id UUID               REFERENCES public.delivery_items(id),
  inspector_id     UUID               NOT NULL REFERENCES public.profiles(id),
  result           public.qc_result,
  status           public.item_status NOT NULL DEFAULT 'qc_pending',
  inspection_date  TIMESTAMPTZ,
  pass_criteria    TEXT,
  remarks          TEXT,
  documents        JSONB              NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ        NOT NULL DEFAULT now()
);

-- ============================================================
-- TRIGGER: auto-assign inspection_ref on INSERT
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_set_qc_inspection_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.inspection_ref = '' OR NEW.inspection_ref IS NULL THEN
    NEW.inspection_ref := public.next_ref('qc_inspection', 'QCI');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_qc_inspections_ref
  BEFORE INSERT ON public.qc_inspections
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_qc_inspection_ref();

CREATE TRIGGER trg_qc_inspections_updated_at
  BEFORE UPDATE ON public.qc_inspections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- QC DEFECTS
-- ============================================================

CREATE TABLE public.qc_defects (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id     UUID          NOT NULL REFERENCES public.qc_inspections(id) ON DELETE CASCADE,
  defect_code       TEXT,
  description       TEXT          NOT NULL,
  severity          TEXT          NOT NULL
                      CHECK (severity IN ('minor', 'major', 'critical')),
  quantity_affected NUMERIC(12,3),
  disposition       TEXT
                      CHECK (disposition IN (
                        'return_to_vendor',
                        'scrap',
                        'accept_on_deviation',
                        'rework'
                      )),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================
-- INVENTORY PINS — PIN number sequence
-- ============================================================

CREATE SEQUENCE public.pin_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- ============================================================
-- INVENTORY PINS
-- ============================================================

CREATE TABLE public.inventory_pins (
  id                        UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  pin_number                TEXT               UNIQUE NOT NULL DEFAULT '',
  description               TEXT               NOT NULL,
  part_number               TEXT,
  category                  TEXT,
  unit                      TEXT               NOT NULL DEFAULT 'EA',
  location_id               UUID               REFERENCES public.store_locations(id),
  status                    public.item_status NOT NULL DEFAULT 'approved',
  is_serialized             BOOLEAN            NOT NULL DEFAULT false,
  serial_number             TEXT,
  min_stock_level           NUMERIC(12,3)      NOT NULL DEFAULT 0,
  max_stock_level           NUMERIC(12,3),
  -- Genealogy
  parent_pin_id             UUID               REFERENCES public.inventory_pins(id),
  derived_from_recovery_id  UUID,              -- FK added in 007_issue_recovery.sql
  origin_type               TEXT
                              CHECK (origin_type IN (
                                'procurement',
                                'recovery',
                                'opening_balance',
                                'transfer',
                                'manual'
                              )),
  origin_reference          TEXT,              -- e.g. 'DLV-000001', 'REC-000001'
  created_at                TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ        NOT NULL DEFAULT now()
);

-- ============================================================
-- TRIGGER: auto-assign pin_number on INSERT
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_set_pin_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.pin_number = '' OR NEW.pin_number IS NULL THEN
    NEW.pin_number := 'PIN-' || lpad(nextval('public.pin_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inventory_pins_pin_number
  BEFORE INSERT ON public.inventory_pins
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_pin_number();

CREATE TRIGGER trg_inventory_pins_updated_at
  BEFORE UPDATE ON public.inventory_pins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- INVENTORY TRANSACTIONS
-- ============================================================

CREATE TABLE public.inventory_transactions (
  id               UUID                    PRIMARY KEY DEFAULT uuid_generate_v4(),
  pin_id           UUID                    NOT NULL REFERENCES public.inventory_pins(id),
  transaction_type public.transaction_type NOT NULL,
  -- positive = stock in, negative = stock out (signed value)
  quantity         NUMERIC(12,3)           NOT NULL,
  quantity_before  NUMERIC(12,3)           NOT NULL DEFAULT 0,
  quantity_after   NUMERIC(12,3)           NOT NULL DEFAULT 0,
  reference_type   TEXT,                   -- e.g. 'delivery', 'issue', 'recovery'
  reference_id     UUID,
  location_id      UUID                    REFERENCES public.store_locations(id),
  unit_cost        NUMERIC(14,4),
  notes            TEXT,
  actor_id         UUID                    NOT NULL REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ             NOT NULL DEFAULT now()
);

CREATE INDEX idx_inv_txn_pin_created
  ON public.inventory_transactions (pin_id, created_at DESC);

CREATE INDEX idx_inv_txn_reference
  ON public.inventory_transactions (reference_type, reference_id);

-- ============================================================
-- VIEW: v_stock_balance
-- Current stock for every PIN, derived from summing all
-- signed transaction quantities.
-- ============================================================

CREATE OR REPLACE VIEW public.v_stock_balance AS
SELECT
  p.id                                            AS pin_id,
  p.pin_number,
  p.description,
  p.part_number,
  p.category,
  p.unit,
  p.location_id,
  sl.code                                         AS location_code,
  sl.name                                         AS location_name,
  sl.warehouse,
  COALESCE(SUM(t.quantity), 0)                    AS current_stock,
  p.min_stock_level,
  p.max_stock_level,
  CASE
    WHEN COALESCE(SUM(t.quantity), 0) <= p.min_stock_level
    THEN true
    ELSE false
  END                                             AS is_low_stock,
  p.status,
  p.parent_pin_id,
  p.origin_type,
  p.origin_reference,
  p.created_at
FROM public.inventory_pins         p
LEFT JOIN public.inventory_transactions t ON t.pin_id     = p.id
LEFT JOIN public.store_locations    sl   ON sl.id         = p.location_id
GROUP BY
  p.id,
  sl.code,
  sl.name,
  sl.warehouse;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_store_locations_warehouse
  ON public.store_locations (warehouse);

CREATE INDEX idx_store_locations_is_active
  ON public.store_locations (is_active);

CREATE INDEX idx_inventory_pins_location_id
  ON public.inventory_pins (location_id);

CREATE INDEX idx_inventory_pins_part_number
  ON public.inventory_pins (part_number);

CREATE INDEX idx_inventory_pins_parent_pin_id
  ON public.inventory_pins (parent_pin_id);

CREATE INDEX idx_inventory_pins_status
  ON public.inventory_pins (status);

CREATE INDEX idx_qc_inspections_delivery_id
  ON public.qc_inspections (delivery_id);

CREATE INDEX idx_qc_inspections_result_status
  ON public.qc_inspections (result, status);

CREATE INDEX idx_qc_defects_inspection_id
  ON public.qc_defects (inspection_id);
