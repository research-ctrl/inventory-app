'use client'

import { cn } from '@/lib/utils'

type StatusColor = {
  bg: string
  text: string
  ring: string
}

const STATUS_COLOR_MAP: Record<string, StatusColor> = {
  // Core workflow
  draft:               { bg: 'bg-gray-100',    text: 'text-gray-700',    ring: 'ring-gray-300' },
  pending_approval:    { bg: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-300' },
  approved:            { bg: 'bg-green-100',   text: 'text-green-700',   ring: 'ring-green-300' },
  rejected:            { bg: 'bg-red-100',     text: 'text-red-700',     ring: 'ring-red-300' },
  in_progress:         { bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-300' },
  // Purchase orders
  ordered:             { bg: 'bg-indigo-100',  text: 'text-indigo-700',  ring: 'ring-indigo-300' },
  partially_delivered: { bg: 'bg-cyan-100',    text: 'text-cyan-700',    ring: 'ring-cyan-300' },
  delivered:           { bg: 'bg-teal-100',    text: 'text-teal-700',    ring: 'ring-teal-300' },
  // Deliveries
  in_transit:          { bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-300' },
  arriving:            { bg: 'bg-violet-100',  text: 'text-violet-700',  ring: 'ring-violet-300' },
  arriving_today:      { bg: 'bg-violet-100',  text: 'text-violet-700',  ring: 'ring-violet-300' },
  delayed:             { bg: 'bg-orange-100',  text: 'text-orange-700',  ring: 'ring-orange-300' },
  received:            { bg: 'bg-teal-100',    text: 'text-teal-700',    ring: 'ring-teal-300' },
  // QC
  qc_pending:          { bg: 'bg-yellow-100',  text: 'text-yellow-700',  ring: 'ring-yellow-300' },
  qc_passed:           { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  qc_failed:           { bg: 'bg-red-100',     text: 'text-red-700',     ring: 'ring-red-300' },
  qc_conditional:      { bg: 'bg-orange-100',  text: 'text-orange-700',  ring: 'ring-orange-300' },
  // Inventory / issues
  issued:              { bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-300' },
  partially_returned:  { bg: 'bg-cyan-100',    text: 'text-cyan-700',    ring: 'ring-cyan-300' },
  fully_returned:      { bg: 'bg-green-100',   text: 'text-green-700',   ring: 'ring-green-300' },
  // Terminal states
  closed:              { bg: 'bg-slate-100',   text: 'text-slate-600',   ring: 'ring-slate-300' },
  cancelled:           { bg: 'bg-gray-100',    text: 'text-gray-500',    ring: 'ring-gray-300' },
  on_hold:             { bg: 'bg-orange-100',  text: 'text-orange-700',  ring: 'ring-orange-300' },
  // Recovery
  pending_assessment:  { bg: 'bg-yellow-100',  text: 'text-yellow-700',  ring: 'ring-yellow-300' },
  assessed:            { bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-300' },
  repair_pending:      { bg: 'bg-orange-100',  text: 'text-orange-700',  ring: 'ring-orange-300' },
  repaired:            { bg: 'bg-teal-100',    text: 'text-teal-700',    ring: 'ring-teal-300' },
  scrapped:            { bg: 'bg-red-100',     text: 'text-red-700',     ring: 'ring-red-300' },
  for_sale:            { bg: 'bg-purple-100',  text: 'text-purple-700',  ring: 'ring-purple-300' },
}

const FALLBACK_COLOR: StatusColor = {
  bg: 'bg-gray-100',
  text: 'text-gray-600',
  ring: 'ring-gray-300',
}

function toTitleCase(str: string): string {
  return str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const colors = STATUS_COLOR_MAP[status] ?? FALLBACK_COLOR
  const label = toTitleCase(status)

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium ring-1 ring-inset rounded-full',
        colors.bg,
        colors.text,
        colors.ring,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
      )}
    >
      {label}
    </span>
  )
}
