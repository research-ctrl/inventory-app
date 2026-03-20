-- ============================================================
-- 003_requirements.sql  — Requirements and requirement line items
-- ============================================================

-- ============================================================
-- REQUIREMENTS
-- ============================================================

CREATE TABLE public.requirements (
  id                UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  ref_number        TEXT              NOT NULL UNIQUE DEFAULT '',
  title             TEXT              NOT NULL,
  description       TEXT,
  vessel_id         UUID              REFERENCES public.vessels(id) ON DELETE SET NULL,
  department_id     UUID              REFERENCES public.departments(id) ON DELETE SET NULL,
  requested_by      UUID              NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  urgency           public.urgency_level NOT NULL DEFAULT 'routine',
  status            public.item_status   NOT NULL DEFAULT 'draft',
  required_date     DATE,
  budget_estimate   NUMERIC(14,2),
  currency          CHAR(3)           NOT NULL DEFAULT 'USD',
  rejection_reason  TEXT,
  approved_by       UUID              REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ       NOT NULL DEFAULT now()
);

-- ============================================================
-- TRIGGER FUNCTION: assign requirement ref_number on INSERT
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_set_requirement_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ref_number = '' OR NEW.ref_number IS NULL THEN
    NEW.ref_number := public.next_ref('requirement', 'REQ');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_requirements_ref_number
  BEFORE INSERT ON public.requirements
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_requirement_ref();

CREATE TRIGGER trg_requirements_updated_at
  BEFORE UPDATE ON public.requirements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- REQUIREMENT ITEMS
-- ============================================================

CREATE TABLE public.requirement_items (
  id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  requirement_id       UUID         NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
  line_number          INT          NOT NULL,
  description          TEXT         NOT NULL,
  part_number          TEXT,
  quantity             NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  unit                 TEXT         NOT NULL,
  estimated_unit_price NUMERIC(14,4),
  currency             CHAR(3)      NOT NULL DEFAULT 'USD',
  specifications       TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT uq_requirement_items_line UNIQUE (requirement_id, line_number)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_requirements_status
  ON public.requirements (status);

CREATE INDEX idx_requirements_requested_by
  ON public.requirements (requested_by);

CREATE INDEX idx_requirements_vessel_id
  ON public.requirements (vessel_id);

CREATE INDEX idx_requirements_urgency_status
  ON public.requirements (urgency, status);
