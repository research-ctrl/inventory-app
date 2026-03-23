'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { format } from 'date-fns';
import { StatusBadge } from '@/components/shared/status-badge';
import ApprovalActionDialog from './approval-action-dialog';

// Shape returned by the approvals query (joined with approver profile)
export interface ApprovalRow {
  id: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_ref?: string | null;  // enriched ref number (e.g. REQ-001, PO-002)
  step_number: number | null;
  status: string | null;
  due_date: string | null;
  created_at: string | null;
  comment: string | null;
  decided_at: string | null;
  escalated: boolean | null;
  approver?: {
    id?: string;
    full_name: string | null;
    email: string;
  } | null;
}

function EntityTypeBadge({ type }: { type: string | null }) {
  const map: Record<string, string> = {
    requirement: 'bg-blue-100 text-blue-800',
    purchase_order: 'bg-violet-100 text-violet-800',
    material_issue: 'bg-teal-100 text-teal-800',
  };
  const label = type
    ? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : '—';
  const cls = type ? (map[type] ?? 'bg-gray-100 text-gray-700') : 'bg-gray-100 text-gray-400';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function entityLink(entityType: string | null, entityId: string | null): string | null {
  if (!entityId) return null;
  if (entityType === 'requirement') return `/requirements/${entityId}`;
  if (entityType === 'purchase_order') return `/procurement/purchase-orders/${entityId}`;
  return null;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd MMM yyyy'); } catch { return d; }
}

// ------------------------------------------------------------------
// Base read-only columns
// ------------------------------------------------------------------
export const approvalColumns: ColumnDef<ApprovalRow>[] = [
  {
    accessorKey: 'entity_type',
    header: 'Type',
    cell: ({ row }) => <EntityTypeBadge type={row.original.entity_type} />,
  },
  {
    accessorKey: 'entity_id',
    header: 'Reference',
    cell: ({ row }) => {
      const link = entityLink(row.original.entity_type, row.original.entity_id);
      const label = row.original.entity_ref ?? (row.original.entity_id ? row.original.entity_id.substring(0, 8) + '…' : '—');
      if (link) {
        return (
          <Link href={link} className="font-mono text-blue-600 hover:underline text-xs font-semibold">
            {label}
          </Link>
        );
      }
      return <span className="font-mono text-xs text-gray-500">{label}</span>;
    },
  },
  {
    accessorKey: 'step_number',
    header: 'Step',
    cell: ({ row }) => (
      <span className="text-sm text-gray-700">{row.original.step_number ?? '—'}</span>
    ),
  },
  {
    id: 'approver',
    header: 'Approver',
    cell: ({ row }) => {
      const a = row.original.approver;
      return (
        <span className="text-sm text-gray-700">
          {a?.full_name ?? a?.email ?? '—'}
        </span>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status ?? 'pending_approval'} />,
  },
  {
    accessorKey: 'due_date',
    header: 'Due',
    cell: ({ row }) => (
      <span className="text-sm text-gray-600">{formatDate(row.original.due_date)}</span>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => (
      <span className="text-sm text-gray-400">{formatDate(row.original.created_at)}</span>
    ),
  },
];

// ------------------------------------------------------------------
// My approvals columns — includes quick approve/reject buttons
// ------------------------------------------------------------------
export const myApprovalColumns: ColumnDef<ApprovalRow>[] = [
  ...approvalColumns,
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const id = row.original.id;
      const status = row.original.status;
      if (status !== 'pending_approval') return null;
      return (
        <div className="flex items-center gap-2">
          <ApprovalActionDialog
            approvalId={id}
            decision="approve"
            entityType={row.original.entity_type}
            triggerLabel="Approve"
            triggerClassName="rounded-lg border border-green-300 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
          />
          <ApprovalActionDialog
            approvalId={id}
            decision="reject"
            entityType={row.original.entity_type}
            triggerLabel="Reject"
            triggerClassName="rounded-lg border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
          />
        </div>
      );
    },
  },
];
