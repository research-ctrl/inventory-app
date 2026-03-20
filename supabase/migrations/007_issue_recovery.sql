-- ============================================================
-- 007_issue_recovery.sql
-- Material issue and recovery / returns tracking for the
-- Shipyard Material Lifecycle System.
--
-- Depends on: 002_core.sql, 006_qc_inventory.sql
-- ============================================================

-- ============================================================
-- MATERIAL ISSUES
-- ============================================================

CREATE TABLE public.material_issues (
  id                   UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_number         TEXT               UNIQUE NOT NULL DEFAULT '',
  pin_id               UUID               NOT NULL REFERENCES public.inventory_pins(id),
  issued_to            UUID               NOT NULL REFERENCES public.profiles(id),
  vessel_id            UUID               REFERENCES public.vessels(id),
  work_order           TEXT,
  quantity             NUMERIC(12,3)      NOT NULL CHECK (quantity > 0),
  quantity_returned    NUMERIC(12,3)      NOT NULL DEFAULT 0,
  unit                 TEXT               NOT NULL,
  status               public.item_status NOT NULL DEFAULT 'draft',
  purpose              TEXT,
  approved_by          UUID               REFERENCES public.profiles(id),
  approved_at          TIMESTAMPTZ,
  issued_by            UUID               REFERENCES public.profiles(id),
  issued_at            TIMESTAMPTZ,
  expected_return_date DATE,
  created_at           TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ        NOT NULL DEFAULT now()
);

-- ============================================================
-- TRIGGER: auto-assign issue_number on INSERT
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_set_issue_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.issue_number = '' OR NEW.issue_number IS NULL THEN
    NEW.issue_number := public.next_ref('issue', 'ISS');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_material_issues_number
  BEFORE INSERT ON public.material_issues
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_issue_number();

CREATE TRIGGER trg_material_issues_updated_at
  BEFORE UPDATE ON public.material_issues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- RECOVERIES
-- ============================================================

CREATE TABLE public.recoveries (
  id                   UUID                    PRIMARY KEY DEFAULT uuid_generate_v4(),
  recovery_ref         TEXT                    UNIQUE NOT NULL DEFAULT '',
  issue_id             UUID                    NOT NULL REFERENCES public.material_issues(id),
  pin_id               UUID                    NOT NULL REFERENCES public.inventory_pins(id),
  quantity_returned    NUMERIC(12,3)           NOT NULL CHECK (quantity_returned > 0),
  outcome              public.recovery_outcome,
  status               public.item_status      NOT NULL DEFAULT 'pending_assessment',
  -- A = as-new … D = barely usable, scrap = unusable
  condition_grade      TEXT
                         CHECK (condition_grade IN ('A', 'B', 'C', 'D', 'scrap')),
  condition_notes      TEXT,
  assessed_by          UUID                    REFERENCES public.profiles(id),
  assessed_at          TIMESTAMPTZ,
  disposition_notes    TEXT,
  -- New PIN created when material re-enters stock after reuse/repair
  derived_pin_id       UUID                    REFERENCES public.inventory_pins(id),
  recovery_location_id UUID                    REFERENCES public.store_locations(id),
  recovered_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ             NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ             NOT NULL DEFAULT now()
);

-- ============================================================
-- TRIGGER: auto-assign recovery_ref on INSERT
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_set_recovery_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.recovery_ref = '' OR NEW.recovery_ref IS NULL THEN
    NEW.recovery_ref := public.next_ref('recovery', 'REC');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recoveries_ref
  BEFORE INSERT ON public.recoveries
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_recovery_ref();

CREATE TRIGGER trg_recoveries_updated_at
  BEFORE UPDATE ON public.recoveries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Back-fill FK: inventory_pins.derived_from_recovery_id → recoveries
-- (column was added in 006 without FK; now we add the constraint)
-- ============================================================

ALTER TABLE public.inventory_pins
  ADD CONSTRAINT fk_pin_derived_from_recovery
  FOREIGN KEY (derived_from_recovery_id)
  REFERENCES public.recoveries(id);

-- ============================================================
-- VIEW: v_material_genealogy
-- Recursive CTE that walks the full parent → child PIN tree,
-- with cycle detection via path array.
-- ============================================================

CREATE OR REPLACE VIEW public.v_material_genealogy AS
WITH RECURSIVE genealogy AS (

  -- Base case: root PINs that have no parent
  SELECT
    p.id,
    p.pin_number,
    p.description,
    p.parent_pin_id,
    p.origin_type,
    p.origin_reference,
    p.derived_from_recovery_id,
    0                        AS depth,
    ARRAY[p.id]              AS path,
    p.pin_number::TEXT       AS lineage
  FROM public.inventory_pins p
  WHERE p.parent_pin_id IS NULL

  UNION ALL

  -- Recursive step: direct children
  SELECT
    c.id,
    c.pin_number,
    c.description,
    c.parent_pin_id,
    c.origin_type,
    c.origin_reference,
    c.derived_from_recovery_id,
    g.depth + 1,
    g.path || c.id,
    g.lineage || ' > ' || c.pin_number
  FROM public.inventory_pins c
  JOIN genealogy g ON c.parent_pin_id = g.id
  WHERE NOT c.id = ANY(g.path)          -- cycle guard

)
SELECT * FROM genealogy;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_material_issues_pin_id
  ON public.material_issues (pin_id);

CREATE INDEX idx_material_issues_issued_to
  ON public.material_issues (issued_to);

CREATE INDEX idx_material_issues_status
  ON public.material_issues (status);

CREATE INDEX idx_material_issues_vessel_id
  ON public.material_issues (vessel_id);

CREATE INDEX idx_recoveries_issue_id
  ON public.recoveries (issue_id);

CREATE INDEX idx_recoveries_status
  ON public.recoveries (status);

CREATE INDEX idx_recoveries_derived_pin_id
  ON public.recoveries (derived_pin_id);
