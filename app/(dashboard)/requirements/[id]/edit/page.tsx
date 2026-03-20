import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getRequirementById, getVessels, getDepartments } from '@/lib/db/queries/requirements';
import RequirementForm from '@/components/requirements/requirement-form';
import { PageHeader } from '@/components/shared/page-header';

export const metadata = { title: 'Edit Requirement | SMLS' };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRequirementPage({ params }: PageProps) {
  const { id } = await params;

  let requirement: any;
  try {
    requirement = await getRequirementById(id);
  } catch {
    notFound();
  }

  // Only allow editing of non-closed/non-rejected requirements
  const nonEditableStatuses = ['closed', 'rejected', 'cancelled'];
  if (nonEditableStatuses.includes(requirement.status)) {
    return (
      <div className="max-w-4xl space-y-6">
        <PageHeader
          title={requirement.ref_number ?? 'Requirement'}
          description="This requirement cannot be edited in its current state."
        />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          Requirements with status <strong>{requirement.status}</strong> cannot be edited.
          <Link href={`/requirements/${id}`} className="ml-2 underline hover:text-amber-900">
            Go back to detail view →
          </Link>
        </div>
      </div>
    );
  }

  const [vessels, departments] = await Promise.all([getVessels(), getDepartments()]);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title={`Edit ${requirement.ref_number}`}
        description={requirement.title}
      >
        <Link
          href={`/requirements/${id}`}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← Back to Detail
        </Link>
      </PageHeader>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <RequirementForm
          mode="edit"
          initialData={requirement}
          vessels={vessels}
          departments={departments}
        />
      </div>
    </div>
  );
}
