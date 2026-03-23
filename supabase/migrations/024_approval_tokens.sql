-- Add approval_token for one-click email approval links
ALTER TABLE public.approvals
  ADD COLUMN IF NOT EXISTS approval_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  ADD COLUMN IF NOT EXISTS token_used_at  TIMESTAMPTZ;

-- Index for fast token lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_approvals_token ON public.approvals(approval_token);

-- Allow unauthenticated (service role) reads for the public approval page
-- The token itself is the security credential
