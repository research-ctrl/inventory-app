-- ─── 012: Profile extensions for admin panel ─────────────────────────────────
-- Adds phone_number and designation (job title) to user profiles.
-- These are set by admins via the admin panel.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number  TEXT,
  ADD COLUMN IF NOT EXISTS designation   TEXT;   -- free-text job title, e.g. "Senior Procurement Officer"

COMMENT ON COLUMN public.profiles.phone_number IS 'Contact phone number, set by admin';
COMMENT ON COLUMN public.profiles.designation  IS 'Job title / designation, set by admin';

-- Allow admins to update any profile (including phone_number / designation / role)
-- The existing RLS policy for profiles already allows super_admin/admin full access.
-- No new policy needed — just making sure columns are present.
