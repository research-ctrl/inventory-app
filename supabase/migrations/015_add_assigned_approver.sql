-- ─── 015: Add assigned approver to requirements ─────────────────────────────
-- Allows specifying who should approve a requirement instead of auto-assigning by role.

ALTER TABLE public.requirements
  ADD COLUMN IF NOT EXISTS assigned_approver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.requirements.assigned_approver_id IS 'Optional: specific person to approve this requirement. If null, auto-assigned by role.';

-- Create index for queries
CREATE INDEX IF NOT EXISTS idx_requirements_assigned_approver
  ON public.requirements(assigned_approver_id);
