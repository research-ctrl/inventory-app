-- Migration 011: Prototype additions
-- Adds columns and tables needed by the prototype layer

-- Add accepted/rejected qty to QC inspections
ALTER TABLE public.qc_inspections
  ADD COLUMN IF NOT EXISTS accepted_qty NUMERIC(12,3),
  ADD COLUMN IF NOT EXISTS rejected_qty NUMERIC(12,3);

-- Add usage outcome to material issues
ALTER TABLE public.material_issues
  ADD COLUMN IF NOT EXISTS usage_outcome TEXT
    CHECK (usage_outcome IN ('not_used', 'leftover', 'scrap')),
  ADD COLUMN IF NOT EXISTS outcome_notes TEXT,
  ADD COLUMN IF NOT EXISTS outcome_captured_at TIMESTAMPTZ;

-- QC returns table for vendor return/replacement loop
CREATE TABLE IF NOT EXISTS public.qc_returns (
  id                      UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_ref              TEXT          UNIQUE NOT NULL,
  inspection_id           UUID          NOT NULL REFERENCES public.qc_inspections(id),
  delivery_id             UUID          NOT NULL REFERENCES public.deliveries(id),
  vendor_id               UUID          REFERENCES public.vendors(id),
  po_id                   UUID          REFERENCES public.purchase_orders(id),
  quantity_returned       NUMERIC(12,3) NOT NULL,
  return_reason           TEXT          NOT NULL,
  status                  TEXT          NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','shipped_to_vendor','replacement_ordered','replacement_received','closed','cancelled')),
  return_notes            TEXT,
  replacement_delivery_id UUID          REFERENCES public.deliveries(id),
  returned_at             TIMESTAMPTZ,
  replacement_expected    DATE,
  created_by              UUID          REFERENCES public.profiles(id),
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qc_returns_inspection ON public.qc_returns(inspection_id);
CREATE INDEX IF NOT EXISTS idx_qc_returns_status ON public.qc_returns(status);
