import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRequirementById } from '@/lib/db/queries/requirements';
import { getAvailableTransitions } from '@/lib/workflow/transitions';
import RequirementDetail from '@/components/requirements/requirement-detail';
import { PageHeader } from '@/components/shared/page-header';

export const metadata = { title: 'Requirement Detail | SMLS' };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RequirementDetailPage({ params }: PageProps) {
  const { id: resolvedId } = await params;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(resolvedId)) notFound()
  const sb = await createClient();

  const {
    data: { user },
  } = await sb.auth.getUser();

  const { data: profile } = await sb
    .from('profiles')
    .select('id, role')
    .eq('id', user?.id ?? '')
    .single();

  let requirement: any;
  try {
    requirement = await getRequirementById(resolvedId);
  } catch {
    notFound();
  }

  const role = profile?.role ?? 'viewer';
  const availableTransitions = getAvailableTransitions('requirement', requirement.status, role);

  const [{ data: history }, { data: linkedPOs }] = await Promise.all([
    sb
      .from('workflow_history')
      .select('*, actor:profiles(full_name, email)')
      .eq('entity_type', 'requirement')
      .eq('entity_id', resolvedId)
      .order('created_at', { ascending: false }),
    sb
      .from('purchase_orders')
      .select('id, po_number, status, total_amount, currency, created_at, vendor:vendors(name)')
      .eq('requirement_id', resolvedId)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={requirement.ref_number ?? 'Requirement'}
        description={requirement.title}
      />
      <RequirementDetail
        requirement={requirement}
        workflowHistory={history ?? []}
        availableTransitions={availableTransitions}
        linkedPOs={linkedPOs ?? []}
        currentRole={role}
      />
    </div>
  );
}
