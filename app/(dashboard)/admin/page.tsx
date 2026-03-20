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

  // Use service-role client for all admin operations
  const adminSb = createAdminClient();

  // Fetch current user's profile
  const { data: currentProfile } = await adminSb
    .from('profiles')
    .select('id, role, full_name, email')
    .eq('id', user.id)
    .single();

  const currentRole = currentProfile?.role ?? 'viewer';
  const isAdmin = ['super_admin', 'admin'].includes(currentRole);

  // Bootstrap logic: if there are NO admins in the system yet,
  // allow the first authenticated user to access the panel and claim admin.
  const { count: adminCount } = await adminSb
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .in('role', ['super_admin', 'admin']);

  const isBootstrapMode = (adminCount ?? 0) === 0;

  // Only block if there ARE admins and the current user is NOT one of them
  if (!isAdmin && !isBootstrapMode) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Admin Panel"
          description="Restricted access"
        />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
          <p className="text-lg font-semibold text-amber-900 mb-2">Access Restricted</p>
          <p className="text-sm text-amber-700">
            You need <strong>Admin</strong> or <strong>Super Admin</strong> role to access this panel.
            <br />
            Please contact your system administrator to grant you access.
          </p>
          <p className="mt-2 text-xs text-amber-500">Your current role: <strong>{currentRole}</strong></p>
        </div>
      </div>
    );
  }

  // Fetch all profiles
  const { data: profiles, error } = await (adminSb
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
    error: any;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Panel"
        description="Manage users, roles, designations, and contact information"
      />

      {isBootstrapMode && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
          <p className="text-sm font-semibold text-blue-800">🚀 Bootstrap Mode</p>
          <p className="text-sm text-blue-700 mt-1">
            No admins have been assigned yet. Use this panel to set your role to{' '}
            <strong>Super Admin</strong> or <strong>Admin</strong>. Once an admin is assigned,
            access will be restricted to admin users only.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Error loading profiles: {error.message}
        </div>
      )}

      <AdminUsersTable
        profiles={profiles ?? []}
        currentUserId={user.id}
        isBootstrapMode={isBootstrapMode}
      />
    </div>
  );
}
