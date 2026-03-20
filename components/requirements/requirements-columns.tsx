'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { format } from 'date-fns';
import { StatusBadge } from '@/components/shared/status-badge';
import type { RequirementRow } from '@/lib/db/queries/requirements';

// Re-export for use by other components
export type { RequirementRow };

const URGENCY_CLASSES: Record<string, string> = {
  critical:
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800',
  urgent:
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800',
  routine:
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700',
};

function formatDate(d: string | null) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd MMM yyyy'); } catch { return d; }
}

export const requirementColumns: ColumnDef<RequirementRow>[] = [
  {
    accessorKey: 'ref_number',
    header: 'Ref #',
    cell: ({ row }) => {
      const id = row.original.id;
      const ref = row.original.ref_number;
      if (!id || !ref) return <span className="font-mono text-gray-400">—</span>;
      return (
        <Link
          href={`/requirements/${id}`}
          className="font-mono text-blue-600 hover:underline"
        >
          {ref}
        </Link>
      );
    },
  },
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => (
      <span className="max-w-xs truncate block text-sm text-gray-900">
        {row.original.title ?? '—'}
      </span>
    ),
  },
  {
    id: 'vessel_name',
    header: 'Vessel',
    accessorFn: (row) => row.vessel?.name ?? '',
    cell: ({ row }) => (
      <span className="text-sm text-gray-700">{row.original.vessel?.name ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'urgency',
    header: 'Urgency',
    cell: ({ row }) => {
      const urgency = row.original.urgency ?? 'routine';
      const cls = URGENCY_CLASSES[urgency] ?? URGENCY_CLASSES.routine;
      return (
        <span className={cls}>
          {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
        </span>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status ?? 'draft'} />,
  },
  {
    accessorKey: 'required_date',
    header: 'Required By',
    cell: ({ row }) => (
      <span className="text-sm text-gray-700">{formatDate(row.original.required_date)}</span>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => (
      <span className="text-sm text-gray-500">{formatDate(row.original.created_at)}</span>
    ),
  },
];
