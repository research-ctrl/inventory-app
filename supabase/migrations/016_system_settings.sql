-- ─── 016: System Settings ─────────────────────────────────────────────────────
-- Key-value store for app-wide configuration (accounts emails, defaults, etc.)

CREATE TABLE IF NOT EXISTS public.system_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '',
  description TEXT,
  updated_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default settings
INSERT INTO public.system_settings (key, value, description) VALUES
  ('accounts_emails',    '', 'Comma-separated list of accounts/finance emails to notify when a requirement is approved and ready for PO creation'),
  ('default_currency',   'USD', 'Default currency for requirements and POs'),
  ('po_due_days',        '3', 'Default number of days for approval due date'),
  ('company_name',       '', 'Company name used in email footers'),
  ('company_gst',        '', 'Default GST/Tax registration number for POs')
ON CONFLICT (key) DO NOTHING;

-- RLS: only admin/super_admin can read/write
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system settings"
  ON public.system_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin')
    )
  );
