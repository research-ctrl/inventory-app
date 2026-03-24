-- ============================================================
-- 028_requirement_issue_link.sql
-- Links material_issues back to the requirement that triggered them.
-- Enables full traceability: requirement → approval → issue → dispatch.
-- ============================================================

-- A. Link issue to requirement (header level)
ALTER TABLE public.material_issues
  ADD COLUMN IF NOT EXISTS requirement_id UUID
    REFERENCES public.requirements(id) ON DELETE SET NULL;

-- B. Link issue to specific requirement line item
ALTER TABLE public.material_issues
  ADD COLUMN IF NOT EXISTS requirement_item_id UUID
    REFERENCES public.requirement_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_material_issues_requirement
  ON public.material_issues(requirement_id);

CREATE INDEX IF NOT EXISTS idx_material_issues_requirement_item
  ON public.material_issues(requirement_item_id);

-- C. Add location_id to material_issues (where material is dispatched from)
ALTER TABLE public.material_issues
  ADD COLUMN IF NOT EXISTS location_id UUID
    REFERENCES public.store_locations(id) ON DELETE SET NULL;
