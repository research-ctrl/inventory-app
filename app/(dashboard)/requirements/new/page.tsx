import { getVessels, getDepartments } from '@/lib/db/queries/requirements';
import RequirementForm from '@/components/requirements/requirement-form';
import { PageHeader } from '@/components/shared/page-header';

export const metadata = { title: 'New Requirement | SMLS' };

export default async function NewRequirementPage() {
  const [vessels, departments] = await Promise.all([getVessels(), getDepartments()]);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="New Requirement"
        description="Submit a new material requirement"
      />
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <RequirementForm mode="create" vessels={vessels} departments={departments} />
      </div>
    </div>
  );
}
