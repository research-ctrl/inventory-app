import { getServerSession } from '@/lib/auth/session';
import { getPendingApprovals } from '@/lib/db/queries/approvals';
import { PageHeader } from '@/components/shared/page-header';
import ApprovalsTable from '@/components/approvals/approvals-table';

export const metadata = { title: 'Approvals | SMLS' };

export default async function ApprovalsPage() {
  const session = await getServerSession();
  const role = session.role;
  const isAdmin = ['admin', 'super_admin'].includes(role);

  const myApprovals = session.profile.id ? await getPendingApprovals(session.profile.id) : [];
  const allApprovals = isAdmin ? await getPendingApprovals() : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Review and decide on pending approval requests"
      />
      <ApprovalsTable
        myApprovals={myApprovals as any}
        allApprovals={allApprovals as any}
        role={role}
      />
    </div>
  );
}
