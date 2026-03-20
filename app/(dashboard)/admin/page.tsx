import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/shared/page-header';
import AdminUsersTable from '@/components/admin/admin-users-table';

export const metadata = { title: 'Admin Panel | SMLS' };

export default async function AdminPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();

  if (!user) redirect('/sign-in');

  // Check role — only admin/super_admin may access
  const { data: profile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['super_admin', 'admin'].includes(profile.role ?? '')) {
    redirect('/');
  }

  // Fetch all profiles using service role (bypasses RLS).
  // phone_number / designation are added by migration 012 — cast to any until types are regenerated.
  const adminSb = createAdminClient();
  const { data: profiles } = await (adminSb
    .from('profiles')
    .select('id, full_name, email, role, department, phone_number, designation')
    .order('full_name', { ascending: true }) as any) as {
    data: Array<{
      id: string;
      full_name: string | null;
      email: string;
      role: string | null;
      department: string | null;
      phone_number: string | null;
      designation: string | null;
    }> | null;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Panel"
        description="Manage users, roles, designations, and contact information"
      />
      <AdminUsersTable profiles={profiles ?? []} currentUserId={user.id} />
    </div>
  );
}
