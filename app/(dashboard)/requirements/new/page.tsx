import { getVessels, getDepartments, getApprovers } from '@/lib/db/queries/requirements';
import { createClient } from '@/lib/supabase/server';
import RequirementForm from '@/components/requirements/requirement-form';
import { PageHeader } from '@/components/shared/page-header';

export const metadata = { title: 'New Requirement | SMLS' };

export default async function NewRequirementPage() {
  const sb = await createClient();
  const [vessels, departments, approvers, { data: vendors }] = await Promise.all([
    getVessels(),
    getDepartments(),
    getApprovers(),
    sb.from('vendors').select('id, name, email').eq('is_active', true).order('name'),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="New Requirement"
        description="Submit a new material requirement"
      />
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <RequirementForm
          mode="create"
          vessels={vessels}
          departments={departments}
          approvers={approvers}
          vendors={vendors ?? []}
        />
      </div>
    </div>
  );
}
