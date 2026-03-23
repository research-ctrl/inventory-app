import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import ApprovalActionDialog from '@/components/approvals/approval-action-dialog';
import { format } from 'date-fns';

export const metadata = { title: 'Approval Detail | SMLS' };

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd MMM yyyy, HH:mm'); } catch { return d; }
}

function entityLink(entityType: string | null, entityId: string | null) {
  if (!entityId) return null;
  if (entityType === 'requirement') return `/requirements/${entityId}`;
  if (entityType === 'purchase_order') return `/procurement/purchase-orders/${entityId}`;
  return null;
}

function entityLabel(entityType: string | null) {
  if (!entityType) return 'Entity';
  return entityType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function ApprovalDetailPage({ params }: PageProps) {
  const { id } = await params;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(id)) notFound()
  const sb = await createClient();

  const {
    data: { user },
  } = await sb.auth.getUser();

  const { data: profile } = await sb
    .from('profiles')
    .select('id, role')
    .eq('id', user?.id ?? '')
    .single();

  // Fetch the approval with approver profile
  const { data: approval, error } = await sb
    .from('approvals')
    .select(`
      *,
      approver:profiles!approvals_approver_id_fkey(id, full_name, email, role)
    `)
    .eq('id', id)
    .single();

  if (error || !approval) notFound();

  const role = profile?.role ?? 'viewer';
  const isOwnPendingApproval =
    profile?.id === approval.approver_id && approval.status === 'pending_approval';
  const isAdmin = ['admin', 'super_admin'].includes(role);
  const canAct = isOwnPendingApproval || isAdmin;

  // Fetch workflow history for the entity
  const { data: history } = approval.entity_id
    ? await sb
        .from('workflow_history')
        .select('*, actor:profiles(full_name, email)')
        .eq('entity_type', approval.entity_type ?? '')
        .eq('entity_id', approval.entity_id)
        .order('created_at', { ascending: false })
    : { data: [] };

  const link = entityLink(approval.entity_type, approval.entity_id);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Approval Request"
        description={`Step ${approval.step_number ?? 1} — ${entityLabel(approval.entity_type)}`}
      />

      {/* Approval card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <StatusBadge status={approval.status ?? 'pending_approval'} />
              {approval.escalated && (
                <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                  Escalated
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Assigned to{' '}
              <span className="font-medium text-gray-900">
                {approval.approver?.full_name ?? approval.approver?.email ?? '—'}
              </span>
            </p>
          </div>

          {canAct && approval.status === 'pending_approval' && (
            <div className="flex items-center gap-2">
              <ApprovalActionDialog
                approvalId={approval.id}
                decision="approve"
                triggerLabel="Approve"
              />
              <ApprovalActionDialog
                approvalId={approval.id}
                decision="reject"
                triggerLabel="Reject"
              />
            </div>
          )}
        </div>

        {/* Details grid */}
        <dl className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900 capitalize">
              {entityLabel(approval.entity_type)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Entity</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">
              {link ? (
                <Link href={link as any} className="text-blue-600 hover:underline font-mono text-xs">
                  {approval.entity_id?.substring(0, 8)}…
                </Link>
              ) : (
                <span className="font-mono text-xs">{approval.entity_id ?? '—'}</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Step</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{approval.step_number ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Due Date</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{formatDate(approval.due_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{formatDate(approval.created_at)}</dd>
          </div>
          {approval.decided_at && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Decided</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">{formatDate(approval.decided_at)}</dd>
            </div>
          )}
        </dl>

        {approval.comment && (
          <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Comment</p>
            <p className="text-sm text-gray-800 italic">&ldquo;{approval.comment}&rdquo;</p>
          </div>
        )}

        {link && (
          <div className="border-t border-gray-100 pt-4">
            <Link
              href={link}
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
            >
              View {entityLabel(approval.entity_type)} &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* Workflow history for the entity */}
      {(history ?? []).length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">
              {entityLabel(approval.entity_type)} Workflow History
            </h2>
          </div>
          <div className="px-6 py-4">
            <ol className="relative border-l border-gray-200 space-y-6 ml-3">
              {(history as any[]).map((entry: any) => (
                <li key={entry.id} className="ml-6">
                  <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 ring-4 ring-white">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-gray-900 capitalize">
                      {entry.event?.replace(/_/g, ' ')}
                    </span>
                    {entry.from_status && (
                      <span className="text-xs text-gray-400">
                        {entry.from_status} &rarr; {entry.to_status}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {entry.actor?.full_name ?? entry.actor?.email ?? 'System'} &middot;{' '}
                    {formatDate(entry.created_at)}
                  </p>
                  {entry.comment && (
                    <p className="mt-1 text-sm text-gray-700 italic">
                      &ldquo;{entry.comment}&rdquo;
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </div>
  );
}
