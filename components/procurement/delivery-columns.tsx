'use client'

import type { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { StatusBadge } from '@/components/shared/status-badge'
import type { DeliveryRow } from '@/lib/db/queries/deliveries'

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const deliveryColumns: ColumnDef<DeliveryRow>[] = [
  {
    accessorKey: 'delivery_ref',
    header: 'Delivery Ref',
    cell: ({ row }) => (
      <Link
        href={`/receiving/${row.original.id}`}
        className="font-mono text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
      >
        {row.original.delivery_ref}
      </Link>
    ),
  },
  {
    id: 'po_number',
    header: 'PO Number',
    cell: ({ row }) => {
      const po = row.original.purchase_order
      if (!po) return <span className="text-gray-400 text-sm">—</span>
      return (
        <Link
          href={`/procurement/purchase-orders/${po.id}`}
          className="font-mono text-sm text-blue-600 hover:underline"
        >
          {po.po_number}
        </Link>
      )
    },
  },
  {
    id: 'vendor_name',
    header: 'Vendor',
    cell: ({ row }) => {
      const vendor = row.original.purchase_order?.vendor
      if (!vendor) return <span className="text-gray-400 text-sm">—</span>
      return <span className="text-sm text-gray-900">{vendor.name}</span>
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" />,
  },
  {
    accessorKey: 'expected_date',
    header: 'Expected Date',
    cell: ({ row }) => (
      <span className="text-sm text-gray-600">{fmtDate(row.original.expected_date)}</span>
    ),
  },
  {
    accessorKey: 'actual_received_date',
    header: 'Received Date',
    cell: ({ row }) => {
      const d = row.original.actual_received_date
      if (!d) return <span className="text-gray-400 text-sm">—</span>
      return <span className="text-sm text-green-700 font-medium">{fmtDate(d)}</span>
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => (
      <span className="text-sm text-gray-500">{fmtDate(row.original.created_at)}</span>
    ),
  },
]
