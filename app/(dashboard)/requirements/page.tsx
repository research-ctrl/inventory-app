import { Suspense } from 'react';
import Link from 'next/link';
import { getRequirements } from '@/lib/db/queries/requirements';
import RequirementsTable from '@/components/requirements/requirements-table';
import { PageHeader } from '@/components/shared/page-header';
import { TableSkeleton } from '@/components/shared/loading-skeleton';

export const metadata = { title: 'Requirements | SMLS' };

export default async function RequirementsPage() {
  const requirements = await getRequirements();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requirements"
        description="Manage material requirements across all vessels"
      >
        <Link
          href="/requirements/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + New Requirement
        </Link>
      </PageHeader>

      <Suspense fallback={<TableSkeleton />}>
        <RequirementsTable data={requirements} />
      </Suspense>
    </div>
  );
}
