-- ── 020: Approval policies — no-approval-needed rules ──
-- Admins can configure rules to bypass approval for certain requirements/issues.
-- ALL payment approvals remain mandatory regardless of these rules.

CREATE TABLE IF NOT EXISTS public.approval_policies (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_name     TEXT          NOT NULL,
  entity_type     TEXT          NOT NULL DEFAULT 'requirement'
                    CHECK (entity_type IN ('requirement', 'issue')),
  -- Match conditions — if ANY of these match AND policy is active, skip approval
  department_code TEXT,          -- skip for requirements from this department
  category        TEXT,          -- skip for requirements of this category
  max_amount      NUMERIC(14,2), -- skip if budget_estimate <= this amount (NULL = no amount check)
  urgency_level   TEXT,          -- skip for this urgency level
  description     TEXT,          -- human-readable explanation
  is_active       BOOLEAN       NOT NULL DEFAULT true,
  created_by      UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.approval_policies IS 'No-approval-needed rules. When a requirement matches a policy, the approval step is skipped.';
COMMENT ON COLUMN public.approval_policies.max_amount IS 'If set, requirements with budget_estimate <= this amount skip approval.';

CREATE TRIGGER trg_approval_policies_updated_at
  BEFORE UPDATE ON public.approval_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_approval_policies_entity ON public.approval_policies(entity_type, is_active);

ALTER TABLE public.approval_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY ap_select
  ON public.approval_policies FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY ap_insert
  ON public.approval_policies FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY ap_update
  ON public.approval_policies FOR UPDATE
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY ap_delete
  ON public.approval_policies FOR DELETE
  USING (public.is_admin());

-- Seed the approval bypass toggle (off by default)
INSERT INTO public.system_settings (key, value, description)
  VALUES ('approval_bypass_enabled', 'false',
          'When true, the approval_policies table is checked. Matching requirements skip the approval step. Payments always require approval.')
ON CONFLICT (key) DO NOTHING;
