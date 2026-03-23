import { createClient } from '@/lib/supabase/server';
import { getPendingApprovals, getCompletedApprovals } from '@/lib/db/queries/approvals';
import { PageHeader } from '@/components/shared/page-header';
import ApprovalsTable from '@/components/approvals/approvals-table';

export const metadata = { title: 'Approvals | SMLS' };

export default async function ApprovalsPage() {
  const sb = await createClient();

  const {
    data: { user },
  } = await sb.auth.getUser();

  const { data: profile } = await sb
    .from('profiles')
    .select('id, role')
    .eq('id', user?.id ?? '')
    .single() as { data: { id: string; role: string } | null; error: any };

  const role = profile?.role ?? 'viewer';
  const isAdmin = ['admin', 'super_admin'].includes(role);

  const [myApprovals, allApprovals, myHistory, allHistory] = await Promise.all([
    profile?.id ? getPendingApprovals(profile.id) : Promise.resolve([]),
    isAdmin ? getPendingApprovals() : Promise.resolve([]),
    profile?.id ? getCompletedApprovals(profile.id) : Promise.resolve([]),
    isAdmin ? getCompletedApprovals() : Promise.resolve([]),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Review and decide on pending approval requests"
      />
      <ApprovalsTable
        myApprovals={myApprovals as any}
        allApprovals={allApprovals as any}
        myHistory={myHistory as any}
        allHistory={allHistory as any}
        role={role}
      />
    </div>
  );
}
