'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Pencil, ShoppingCart } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import StockCheckPanel from './stock-check-panel';
import { transitionRequirement } from '@/actions/requirements';

interface WorkflowHistoryEntry {
  id: string;
  from_status: string | null;
  to_status: string;
  event: string;
  comment: string | null;
  created_at: string;
  actor?: {
    full_name: string | null;
    email: string;
  } | null;
}

interface AvailableTransition {
  to: string;
  event: string;
  label: string;
  requiresComment?: boolean;
}

interface LinkedPO {
  id: string;
  po_number: string | null;
  status: string | null;
  total_amount: number | null;
  currency: string | null;
  created_at: string;
  vendor?: { name: string } | { name: string }[] | null;
}

interface RequirementDetailProps {
  requirement: any;
  workflowHistory: WorkflowHistoryEntry[];
  availableTransitions: AvailableTransition[];
  stockData?: any[];
  linkedPOs?: LinkedPO[];
  currentRole: string;
}

const URGENCY_CLASSES: Record<string, string> = {
  critical:
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-800',
  urgent:
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800',
  routine:
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700',
};

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value ?? '—'}</p>
    </div>
  );
}

function formatDate(d: string | null) {
  if (!d) return '—';
  try {
    return format(new Date(d), 'dd MMM yyyy');
  } catch {
    return d;
  }
}

function formatDateTime(d: string | null) {
  if (!d) return '—';
  try {
    return format(new Date(d), 'dd MMM yyyy, HH:mm');
  } catch {
    return d;
  }
}

interface TransitionButtonProps {
  transition: AvailableTransition;
  requirementId: string;
  currentStatus: string;
  onDone: () => void;
}

function TransitionButton({
  transition,
  requirementId,
  currentStatus,
  onDone,
}: TransitionButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [showDialog, setShowDialog] = useState(false);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isDestructive = transition.to === 'rejected' || transition.to === 'cancelled';
  const needsComment = transition.requiresComment || isDestructive;

  const handleConfirm = () => {
    if (needsComment && !comment.trim()) {
      setError('A reason is required for this action.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await transitionRequirement(
          requirementId,
          transition.to,
          comment.trim() || undefined
        );
        if (result && 'error' in result && result.error) {
          setError(typeof result.error === 'string' ? result.error : 'Transition failed.');
          return;
        }
        setShowDialog(false);
        onDone();
      } catch (err: any) {
        setError(err?.message ?? 'Transition failed. Please try again.');
      }
    });
  };

  if (!showDialog) {
    return (
      <button
        type="button"
        onClick={() => (isDestructive || needsComment ? setShowDialog(true) : handleConfirm())}
        disabled={isPending}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
          isDestructive
            ? 'border border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
            : 'border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
        }`}
      >
        {isPending ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {transition.label}
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={() => setShowDialog(false)}
        aria-hidden="true"
      />
      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transition-dialog-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
          {transition.to === 'cancelled' && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm font-semibold text-red-800">Are you sure you want to cancel this request?</p>
              <p className="text-xs text-red-700 mt-0.5">
                This action will notify the original requester by email. Please provide a reason below.
              </p>
            </div>
          )}
          <h2
            id="transition-dialog-title"
            className="text-base font-semibold text-gray-900 mb-1"
          >
            {transition.label}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {needsComment
              ? 'Please provide a reason for this decision.'
              : 'Add an optional comment before proceeding.'}
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder={needsComment ? 'Reason (required)…' : 'Comment (optional)…'}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowDialog(false);
                setComment('');
                setError(null);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Go Back
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                isDestructive
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isPending ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : null}
              {transition.to === 'cancelled' ? 'Yes, Cancel Request' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function RequirementDetail({
  requirement,
  workflowHistory,
  availableTransitions,
  stockData,
  linkedPOs = [],
  currentRole,
}: RequirementDetailProps) {
  const [, startTransition] = useTransition();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTransitionDone = () => {
    startTransition(() => setRefreshKey((k) => k + 1));
    window.location.reload();
  };

  const items: Array<{
    description: string;
    part_number?: string;
    quantity: number;
    unit: string;
  }> = (requirement.requirement_items ?? []).map((item: any) => ({
    description: item.description,
    part_number: item.part_number,
    quantity: item.quantity,
    unit: item.unit,
  }));

  const urgency = requirement.urgency ?? 'routine';
  const urgencyClass = URGENCY_CLASSES[urgency] ?? URGENCY_CLASSES.routine;

  return (
    <div className="space-y-6" key={refreshKey}>
      {/* 1. Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-6">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-gray-500">{requirement.ref_number}</span>
            <StatusBadge status={requirement.status ?? 'draft'} />
            <span className={urgencyClass}>
              {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
            </span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">{requirement.title}</h1>
          {requirement.description && (
            <p className="text-sm text-gray-600">{requirement.description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Edit button — hidden for closed/rejected */}
          {!['closed', 'rejected', 'cancelled'].includes(requirement.status) && (
            <Link
              href={`/requirements/${requirement.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
          )}
          {availableTransitions
            .filter((t) => {
              // Hide "Raise PO" if a PO already exists — it was auto-created on approval
              if (t.event === 'raise_po' && linkedPOs.length > 0) return false
              return true
            })
            .map((t) => (
              <TransitionButton
                key={t.event}
                transition={t}
                requirementId={requirement.id}
                currentStatus={requirement.status}
                onDone={handleTransitionDone}
              />
            ))}
        </div>
      </div>

      {/* Workflow context banners */}
      {requirement.status === 'pending_approval' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-amber-900">⏳ Awaiting Approval</p>
            <p className="text-xs text-amber-700 mt-0.5">
              This requirement has been submitted and is pending approver review.
            </p>
          </div>
          <Link
            href="/approvals"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition-colors shadow-sm"
          >
            View Approvals →
          </Link>
        </div>
      )}
      {requirement.status === 'approved' && linkedPOs.length === 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-green-900">✅ Approved — Ready for Purchase Order</p>
            <p className="text-xs text-green-700 mt-0.5">
              This requirement is approved. Create a Purchase Order to proceed with procurement.
            </p>
          </div>
          <Link
            href={`/procurement/purchase-orders/new?requirement_id=${requirement.id}`}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors shadow-sm"
          >
            Create Purchase Order →
          </Link>
        </div>
      )}
      {requirement.status === 'in_progress' && linkedPOs.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-900">🛒 Purchase Order Created — Awaiting Approval</p>
            <p className="text-xs text-blue-700 mt-0.5">
              A Purchase Order has been raised and is pending approval. Once approved, the vendor will be notified.
            </p>
          </div>
          <Link
            href={`/procurement/purchase-orders/${linkedPOs[0].id}`}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            View PO {linkedPOs[0].po_number} →
          </Link>
        </div>
      )}

      {/* 2. Info Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <InfoCard
          label="Vessel"
          value={requirement.vessel?.name ?? requirement.vessels?.name ?? '—'}
        />
        <InfoCard
          label="Department"
          value={requirement.department?.name ?? requirement.departments?.name ?? '—'}
        />
        <InfoCard
          label="Posted By"
          value={
            requirement.requested_by_profile?.full_name ??
            requirement.requested_by_profile?.email ??
            requirement.profiles?.full_name ??
            requirement.profiles?.email ??
            '—'
          }
        />
        <InfoCard
          label="Assigned Approver"
          value={
            requirement.assigned_approver?.full_name ??
            requirement.assigned_approver?.email ??
            '(Auto-assign by role)'
          }
        />
        <InfoCard
          label="Approved By"
          value={
            requirement.approved_by_profile?.full_name ??
            requirement.approved_by_profile?.email ??
            '—'
          }
        />
        <InfoCard label="Required By" value={formatDate(requirement.required_date)} />
        <InfoCard label="Created" value={formatDateTime(requirement.created_at)} />
        <InfoCard
          label="Budget"
          value={
            requirement.budget_estimate != null
              ? `${requirement.currency ?? 'USD'} ${Number(
                  requirement.budget_estimate
                ).toLocaleString()}`
              : '—'
          }
        />
        <InfoCard
          label="Preferred Vendor"
          value={requirement.preferred_vendor?.name ?? '— Any vendor —'}
        />
        {requirement.requested_on_behalf_of && (
          <InfoCard
            label="On Behalf Of"
            value={requirement.requested_on_behalf_of}
          />
        )}
      </div>

      {/* Reason block */}
      {requirement.reason && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-1">
            Reason for Request
          </p>
          <p className="text-sm text-blue-900">{requirement.reason}</p>
        </div>
      )}

      {/* 3. Line Items */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">#</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Description</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Part No.</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">Qty</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Unit</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">
                  Est. Unit Price
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {(requirement.requirement_items ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-sm text-gray-400"
                  >
                    No line items recorded.
                  </td>
                </tr>
              ) : (
                (requirement.requirement_items as any[]).map(
                  (item: any, idx: number) => (
                    <tr key={item.id ?? idx}>
                      <td className="px-4 py-3 text-gray-400">
                        {item.line_number ?? idx + 1}
                      </td>
                      <td className="px-4 py-3 text-gray-900">{item.description}</td>
                      <td className="px-4 py-3 font-mono text-gray-500">
                        {item.part_number ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{item.unit}</td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {item.estimated_unit_price != null
                          ? Number(item.estimated_unit_price).toLocaleString(
                              undefined,
                              { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                            )
                          : '—'}
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Stock Check Panel */}
      {items.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <StockCheckPanel items={items} stockData={stockData} />
        </section>
      )}

      {/* 5. Linked Purchase Orders */}
      {linkedPOs.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-6 py-4 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">
              Linked Purchase Orders
              <span className="ml-2 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                {linkedPOs.length}
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">PO Number</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Vendor</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Total Amount</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Created</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {linkedPOs.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">
                      {po.po_number ?? po.id.substring(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {Array.isArray(po.vendor)
                        ? (po.vendor[0]?.name ?? '—')
                        : (po.vendor as any)?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={po.status ?? 'draft'} />
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {po.total_amount != null
                        ? `${po.currency ?? 'USD'} ${Number(po.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(po.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/procurement/purchase-orders/${po.id}`}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 6. Workflow History */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Workflow History</h2>
        </div>
        <div className="px-6 py-4">
          {workflowHistory.length === 0 ? (
            <p className="text-sm text-gray-400">No workflow events recorded.</p>
          ) : (
            <ol className="relative border-l border-gray-200 space-y-6 ml-3">
              {workflowHistory.map((entry) => (
                <li key={entry.id} className="ml-6">
                  <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 ring-4 ring-white">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-gray-900 capitalize">
                      {entry.event.replace(/_/g, ' ')}
                    </span>
                    {entry.from_status && (
                      <span className="text-xs text-gray-400">
                        {entry.from_status} &rarr; {entry.to_status}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {entry.actor?.full_name ?? entry.actor?.email ?? 'System'} &middot;{' '}
                    {formatDateTime(entry.created_at)}
                  </p>
                  {entry.comment && (
                    <p className="mt-1 text-sm text-gray-700 italic">
                      &ldquo;{entry.comment}&rdquo;
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}
