'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Pencil, ChevronDown, Loader2, Check } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { transitionRequirement, updateRequirementUrgency } from '@/actions/requirements';
import { WORKFLOW_TRANSITIONS } from '@/lib/workflow/transitions';
import type { RequirementRow } from '@/lib/db/queries/requirements';
import type { Role } from '@/lib/auth/roles';

// ── Roles that can edit urgency ──────────────────────────────────────────────
const URGENCY_EDIT_ROLES: Role[] = [
  'super_admin', 'admin', 'procurement_manager', 'procurement_officer',
  'engineer', 'store_manager',
];

const URGENCY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  urgent:   'bg-amber-100 text-amber-800 border-amber-200',
  routine:  'bg-gray-100 text-gray-700 border-gray-200',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

const URGENCY_OPTIONS = [
  { value: '', label: 'All Urgency' },
  { value: 'routine', label: 'Routine' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'critical', label: 'Critical' },
];

function formatDate(d: string | null) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd MMM yyyy'); } catch { return d; }
}

// ── Inline Urgency Cell ──────────────────────────────────────────────────────
function UrgencyCell({
  row,
  canEdit,
  onUpdate,
}: {
  row: RequirementRow;
  canEdit: boolean;
  onUpdate: (id: string, urgency: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useState(row.urgency ?? 'routine');
  const immutable = ['closed', 'rejected', 'cancelled'].includes(row.status ?? '');

  function handleSelect(urgency: 'routine' | 'urgent' | 'critical') {
    setOpen(false);
    if (urgency === current) return;
    startTransition(async () => {
      const result = await updateRequirementUrgency(row.id, urgency);
      if (result.success) {
        setCurrent(urgency);
        onUpdate(row.id, urgency);
      }
    });
  }

  const badge = (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${
        URGENCY_STYLES[current] ?? URGENCY_STYLES.routine
      }`}
    >
      {isPending ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : null}
      {current.charAt(0).toUpperCase() + current.slice(1)}
      {canEdit && !immutable && <ChevronDown className="h-2.5 w-2.5 opacity-60" />}
    </span>
  );

  if (!canEdit || immutable) return badge;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={isPending}
        className="focus:outline-none"
        aria-label="Change urgency"
      >
        {badge}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 w-32 rounded-xl bg-white border border-gray-200 shadow-lg overflow-hidden">
            {(['routine', 'urgent', 'critical'] as const).map((u) => (
              <button
                key={u}
                onClick={() => handleSelect(u)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-gray-50 transition-colors ${
                  u === current ? 'font-semibold' : ''
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${
                  u === 'critical' ? 'bg-red-500' :
                  u === 'urgent'   ? 'bg-amber-500' : 'bg-gray-400'
                }`} />
                {u.charAt(0).toUpperCase() + u.slice(1)}
                {u === current && <Check className="h-3 w-3 ml-auto text-blue-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Inline Status / Transition Cell ──────────────────────────────────────────
function StatusCell({
  row,
  currentRole,
  onUpdate,
}: {
  row: RequirementRow;
  currentRole: Role;
  onUpdate: (id: string, status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [currentStatus, setCurrentStatus] = useState(row.status ?? 'draft');
  const [error, setError] = useState<string | null>(null);

  // Which transitions are available for this row + role
  const transitions = useMemo(() => {
    const all = WORKFLOW_TRANSITIONS['requirement'] ?? [];
    return all.filter(
      (t) => t.from === currentStatus && t.allowedRoles.includes(currentRole as any)
    );
  }, [currentStatus, currentRole]);

  function handleTransition(toStatus: string, event: string) {
    setOpen(false);
    setError(null);
    startTransition(async () => {
      const result = await transitionRequirement(row.id, toStatus);
      if (result && 'error' in result && result.error) {
        setError(typeof result.error === 'string' ? result.error : 'Failed');
        return;
      }
      setCurrentStatus(toStatus);
      onUpdate(row.id, toStatus);
    });
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <StatusBadge status={currentStatus} />
      {isPending && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}

      {transitions.length > 0 && !isPending && (
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
            title="Change status"
          >
            <ChevronDown className="h-2.5 w-2.5" />
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute left-0 top-full mt-1 z-20 w-44 rounded-xl bg-white border border-gray-200 shadow-lg overflow-hidden">
                <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide border-b">
                  Change Status
                </p>
                {transitions.map((t) => (
                  <button
                    key={t.event}
                    onClick={() => handleTransition(t.to, t.event)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                      t.to === 'rejected' ? 'text-red-600 hover:bg-red-50' :
                      t.to === 'approved' ? 'text-green-700 hover:bg-green-50' :
                      'text-gray-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {error && <span className="text-[10px] text-red-500">{error}</span>}
    </div>
  );
}

// ── Main Table Component ─────────────────────────────────────────────────────
interface RequirementsTableProps {
  data: RequirementRow[];
  currentRole: Role;
}

export default function RequirementsTable({ data, currentRole }: RequirementsTableProps) {
  const [rows, setRows] = useState<RequirementRow[]>(data);
  const [statusFilter, setStatusFilter]   = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [search, setSearch]               = useState('');

  const canEditUrgency = URGENCY_EDIT_ROLES.includes(currentRole);

  function handleUrgencyUpdate(id: string, urgency: string) {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, urgency } : r));
  }

  function handleStatusUpdate(id: string, status: string) {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
  }

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (urgencyFilter && row.urgency !== urgencyFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !(row.title?.toLowerCase().includes(q) ||
            row.ref_number?.toLowerCase().includes(q) ||
            row.vessel?.name?.toLowerCase().includes(q) ||
            row.requested_by_profile?.full_name?.toLowerCase().includes(q) ||
            row.requested_by_profile?.email?.toLowerCase().includes(q))
        ) return false;
      }
      return true;
    });
  }, [rows, statusFilter, urgencyFilter, search]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {URGENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, ref, vessel, posted by…"
          className="flex-1 min-w-[200px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {(statusFilter || urgencyFilter || search) && (
          <button
            type="button"
            onClick={() => { setStatusFilter(''); setUrgencyFilter(''); setSearch(''); }}
            className="text-sm text-gray-500 hover:text-gray-800 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Role hint */}
      {canEditUrgency && (
        <p className="text-xs text-gray-400">
          💡 <strong>Tip:</strong> Click the urgency badge or the <ChevronDown className="inline h-3 w-3" /> next to status to edit inline.
        </p>
      )}

      {/* Table */}
      <div className="overflow-x-auto border-t border-gray-100">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ref #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Vessel</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Posted By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Urgency</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Required By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Created</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">
                    No requirements found.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const postedBy =
                    row.requested_by_profile?.full_name ??
                    row.requested_by_profile?.email ?? '—';
                  return (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      {/* Ref */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/requirements/${row.id}`}
                          className="font-mono text-blue-600 hover:underline text-sm"
                        >
                          {row.ref_number ?? '—'}
                        </Link>
                      </td>
                      {/* Title */}
                      <td className="px-4 py-3">
                        <span className="max-w-[200px] truncate block text-sm text-gray-900" title={row.title ?? ''}>
                          {row.title ?? '—'}
                        </span>
                      </td>
                      {/* Vessel */}
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.vessel?.name ?? '—'}
                      </td>
                      {/* Posted By */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 max-w-[120px] truncate block" title={postedBy}>
                          {postedBy}
                        </span>
                      </td>
                      {/* Urgency — inline editable */}
                      <td className="px-4 py-3">
                        <UrgencyCell
                          row={row}
                          canEdit={canEditUrgency}
                          onUpdate={handleUrgencyUpdate}
                        />
                      </td>
                      {/* Status — inline transitions */}
                      <td className="px-4 py-3">
                        <StatusCell
                          row={row}
                          currentRole={currentRole}
                          onUpdate={handleStatusUpdate}
                        />
                      </td>
                      {/* Required By */}
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatDate(row.required_date)}
                      </td>
                      {/* Created */}
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(row.created_at)}
                      </td>
                      {/* Edit */}
                      <td className="px-4 py-3">
                        {!['closed', 'rejected', 'cancelled'].includes(row.status ?? '') && (
                          <Link
                            href={`/requirements/${row.id}/edit`}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 text-right">{filtered.length} requirement{filtered.length !== 1 ? 's' : ''}</p>
    </div>
  );
}
