import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerSession } from '@/lib/auth/session';
import { getRequirementById } from '@/lib/db/queries/requirements';
import { getAvailableTransitions } from '@/lib/workflow/transitions';
import RequirementDetail from '@/components/requirements/requirement-detail';
import { PageHeader } from '@/components/shared/page-header';

export const metadata = { title: 'Requirement Detail | SMLS' };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RequirementDetailPage({ params }: PageProps) {
  const sb = await createClient();
  const { role } = await getServerSession();

  let requirement: any;
  try {
    requirement = await getRequirementById((await params).id);
  } catch {
    notFound();
  }

  const availableTransitions = getAvailableTransitions('requirement', requirement.status, role);

  const { data: history } = await sb
    .from('workflow_history')
    .select('*, actor:profiles(full_name, email)')
    .eq('entity_type', 'requirement')
    .eq('entity_id', (await params).id)
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title={requirement.ref_number ?? 'Requirement'}
        description={requirement.title}
      />
      <RequirementDetail
        requirement={requirement}
        workflowHistory={history ?? []}
        availableTransitions={availableTransitions}
        currentRole={role}
      />
    </div>
  );
}
