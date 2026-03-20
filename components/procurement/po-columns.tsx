'use client'

import type { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { StatusBadge } from '@/components/shared/status-badge'
import type { PurchaseOrderRow } from '@/lib/db/queries/purchase-orders'

function fmtCurrency(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency ?? 'USD',
    maximumFractionDigits: 2,
  }).format(amount)
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const poColumns: ColumnDef<PurchaseOrderRow>[] = [
  {
    accessorKey: 'po_number',
    header: 'PO Number',
    cell: ({ row }) => (
      <Link
        href={`/procurement/purchase-orders/${row.original.id}`}
        className="font-mono text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
      >
        {row.original.po_number}
      </Link>
    ),
  },
  {
    id: 'vendor',
    header: 'Vendor',
    cell: ({ row }) => {
      const v = row.original.vendor
      if (!v) return <span className="text-gray-400 text-sm">—</span>
      return (
        <div>
          <p className="text-sm font-medium text-gray-900">{v.name}</p>
          <p className="text-xs text-gray-400 font-mono">{v.code}</p>
        </div>
      )
    },
  },
  {
    id: 'requirement',
    header: 'Requirement',
    cell: ({ row }) => {
      const r = row.original.requirement
      if (!r) return <span className="text-gray-400 text-sm">—</span>
      return (
        <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
          {r.ref_number}
        </span>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" />,
  },
  {
    accessorKey: 'total_amount',
    header: 'Total Amount',
    cell: ({ row }) => (
      <span className="text-sm font-medium text-gray-900">
        {fmtCurrency(row.original.total_amount, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: 'expected_delivery',
    header: 'Expected Delivery',
    cell: ({ row }) => (
      <span className="text-sm text-gray-600">{fmtDate(row.original.expected_delivery)}</span>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => (
      <span className="text-sm text-gray-500">{fmtDate(row.original.created_at)}</span>
    ),
  },
]
