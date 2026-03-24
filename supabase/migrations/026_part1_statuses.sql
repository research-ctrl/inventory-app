-- ============================================================
-- 026_part1_statuses.sql — Part 1 workflow statuses
-- ============================================================
-- Adds new status values for simplified Part 1 workflow:
-- Requirement → Procurement decision → Email approval for inventory release

-- Add new item_status values
ALTER TYPE public.item_status ADD VALUE 'to_order';
ALTER TYPE public.item_status ADD VALUE 'to_enquire_price';
ALTER TYPE public.item_status ADD VALUE 'to_release_from_inventory';
ALTER TYPE public.item_status ADD VALUE 'request_release';
ALTER TYPE public.item_status ADD VALUE 'keep_on_hold';
ALTER TYPE public.item_status ADD VALUE 'deny';
ALTER TYPE public.item_status ADD VALUE 'order_inventory_release_accepted';

-- Add approval_tokens table for email-based approvals (no login required)
CREATE TABLE IF NOT EXISTS public.approval_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  approver_email TEXT NOT NULL,
  action TEXT NOT NULL, -- 'approve_release', etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  approved_by_email TEXT,
  approval_comment TEXT,
  created_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX idx_approval_tokens_requirement_id ON public.approval_tokens(requirement_id);
CREATE INDEX idx_approval_tokens_token ON public.approval_tokens(token);
CREATE INDEX idx_approval_tokens_expires_at ON public.approval_tokens(expires_at);

-- Add columns to requirements table for approval tracking
ALTER TABLE public.requirements
ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approval_requested_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approval_decision_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approval_decision_by_email TEXT,
ADD COLUMN IF NOT EXISTS approval_comment TEXT,
ADD COLUMN IF NOT EXISTS procurement_decision_status TEXT, -- 'to_order', 'to_enquire_price', 'to_release_from_inventory'
ADD COLUMN IF NOT EXISTS procurement_decision_made_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS procurement_decision_made_by UUID REFERENCES public.profiles(id);

CREATE INDEX idx_requirements_procurement_decision_status ON public.requirements(procurement_decision_status);

-- Add workflow_event values for Part 1 actions
ALTER TYPE public.workflow_event ADD VALUE IF NOT EXISTS 'procurement_review';
ALTER TYPE public.workflow_event ADD VALUE IF NOT EXISTS 'request_inventory_release';
ALTER TYPE public.workflow_event ADD VALUE IF NOT EXISTS 'approve_release';
ALTER TYPE public.workflow_event ADD VALUE IF NOT EXISTS 'deny_release';
