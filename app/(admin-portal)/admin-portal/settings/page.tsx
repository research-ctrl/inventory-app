import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Users, Settings } from 'lucide-react'
import SystemSettingsForm from '@/components/admin-portal/system-settings-form'
import { getSystemSettings } from '@/actions/settings'

export const metadata = { title: 'Admin Settings | SMLS' }

export default async function AdminPortalSettingsPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  if (!user) redirect('/admin-portal/sign-in')

  const adminSb = createAdminClient()
  const { data: profile } = await adminSb
    .from('profiles').select('role').eq('id', user.id).single()

  const isAdmin = ['super_admin', 'admin'].includes(profile?.role ?? '')
  if (!isAdmin) redirect('/admin-portal')

  const settings = await getSystemSettings()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Admin Portal</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage users, roles, and system configuration</p>
      </div>

      {/* Nav tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { label: 'Users', icon: Users, href: '/admin-portal', active: false },
          { label: 'Settings', icon: Settings, href: '/admin-portal/settings', active: true },
        ].map(({ label, icon: Icon, href, active }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              active
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>

      {/* System Settings Form */}
      <SystemSettingsForm initial={settings} />

      {/* Database Migration card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Database Migrations</h2>
        <p className="text-xs text-gray-500 mb-4">
          Run these SQL snippets in the{' '}
          <strong>Supabase SQL Editor</strong> if you haven't done so already.
        </p>

        <div className="space-y-4">
          {/* Migration 013 */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Migration 013 — Bootstrap Admin + Auto-profile trigger</p>
            <div className="rounded-lg bg-gray-900 p-4 overflow-x-auto">
              <pre className="text-xs text-green-300 whitespace-pre leading-relaxed">{`-- Auto-create profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    'viewer'::public.user_role
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Promote to super_admin (replace email as needed)
DO $$ DECLARE v UUID;
BEGIN
  SELECT id INTO v FROM auth.users WHERE email = 'myron@bennetandbernard.com';
  IF v IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, role)
    VALUES (v, 'myron@bennetandbernard.com', 'super_admin')
    ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
  END IF;
END; $$;`}</pre>
            </div>
          </div>

          {/* Migration 015 */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Migration 015 — Add assigned_approver_id to requirements</p>
            <div className="rounded-lg bg-gray-900 p-4 overflow-x-auto">
              <pre className="text-xs text-green-300 whitespace-pre leading-relaxed">{`ALTER TABLE public.requirements
  ADD COLUMN IF NOT EXISTS assigned_approver_id UUID
  REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_requirements_assigned_approver
  ON public.requirements(assigned_approver_id);`}</pre>
            </div>
          </div>

          {/* Migration 016 */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Migration 016 — System Settings table</p>
            <div className="rounded-lg bg-gray-900 p-4 overflow-x-auto">
              <pre className="text-xs text-green-300 whitespace-pre leading-relaxed">{`CREATE TABLE IF NOT EXISTS public.system_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '',
  description TEXT,
  updated_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.system_settings (key, value, description) VALUES
  ('accounts_emails',  '', 'Comma-separated accounts/finance emails'),
  ('default_currency', 'USD', 'Default currency'),
  ('po_due_days',      '3', 'Approval due days'),
  ('company_name',     '', 'Company name for PO documents'),
  ('company_gst',      '', 'GST/Tax registration number')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage system settings"
  ON public.system_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );`}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
