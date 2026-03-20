'use client'

import type { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { CheckCircle2, Clock } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'

export type VendorRow = {
  id: string
  code: string
  name: string
  trade_name: string | null
  category: string | null
  city: string | null
  country: string | null
  rating: number | null
  payment_terms_days: number | null
  currency: string | null
  is_approved: boolean
  blacklisted: boolean
  created_at: string
  vendor_contacts?: Array<{ id: string; name: string; is_primary: boolean }>
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-gray-400 text-sm">—</span>
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  const empty = 5 - full - (half ? 1 : 0)
  return (
    <span className="flex items-center gap-0.5 text-amber-400 text-sm">
      {'★'.repeat(full)}
      {half ? '½' : ''}
      <span className="text-gray-300">{'★'.repeat(empty)}</span>
      <span className="ml-1 text-gray-600 text-xs font-medium">{rating.toFixed(1)}</span>
    </span>
  )
}

const CATEGORY_COLORS: Record<string, string> = {
  electrical: 'bg-yellow-100 text-yellow-700 ring-yellow-200',
  mechanical: 'bg-blue-100 text-blue-700 ring-blue-200',
  paint: 'bg-purple-100 text-purple-700 ring-purple-200',
  hardware: 'bg-orange-100 text-orange-700 ring-orange-200',
  safety: 'bg-red-100 text-red-700 ring-red-200',
  general: 'bg-gray-100 text-gray-700 ring-gray-200',
}

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return <span className="text-gray-400 text-sm">—</span>
  const cls = CATEGORY_COLORS[category.toLowerCase()] ?? 'bg-gray-100 text-gray-700 ring-gray-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset capitalize ${cls}`}>
      {category}
    </span>
  )
}

export const vendorColumns: ColumnDef<VendorRow>[] = [
  {
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }) => (
      <Link
        href={`/vendors/${row.original.id}`}
        className="font-mono text-sm text-blue-600 hover:text-blue-800 hover:underline"
      >
        {row.original.code}
      </Link>
    ),
    size: 100,
  },
  {
    accessorKey: 'name',
    header: 'Vendor Name',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-gray-900 text-sm">{row.original.name}</p>
        {row.original.trade_name && (
          <p className="text-xs text-gray-500">{row.original.trade_name}</p>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => <CategoryBadge category={row.original.category} />,
  },
  {
    id: 'location',
    header: 'Location',
    cell: ({ row }) => {
      const { city, country } = row.original
      if (!city && !country) return <span className="text-gray-400 text-sm">—</span>
      return (
        <span className="text-sm text-gray-700">
          {[city, country].filter(Boolean).join(', ')}
        </span>
      )
    },
  },
  {
    accessorKey: 'rating',
    header: 'Rating',
    cell: ({ row }) => <StarRating rating={row.original.rating} />,
  },
  {
    accessorKey: 'payment_terms_days',
    header: 'Payment Terms',
    cell: ({ row }) => {
      const days = row.original.payment_terms_days
      if (days === null) return <span className="text-gray-400 text-sm">—</span>
      return <span className="text-sm text-gray-700">{days} days</span>
    },
  },
  {
    accessorKey: 'is_approved',
    header: 'Status',
    cell: ({ row }) => {
      if (row.original.blacklisted) {
        return <StatusBadge status="rejected" size="sm" />
      }
      if (row.original.is_approved) {
        return (
          <span className="inline-flex items-center gap-1 text-green-700 text-xs font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approved
          </span>
        )
      }
      return (
        <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium">
          <Clock className="h-3.5 w-3.5" />
          Pending
        </span>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => (
      <span className="text-sm text-gray-500">
        {new Date(row.original.created_at).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
      </span>
    ),
  },
]
