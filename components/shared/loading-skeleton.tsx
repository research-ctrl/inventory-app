import { cn } from '@/lib/utils'

// ─── Primitive ───────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse bg-gray-200 rounded', className)}
      aria-hidden="true"
    />
  )
}

// ─── TableSkeleton ────────────────────────────────────────────────────────────

interface TableSkeletonProps {
  rows?: number
  cols?: number
}

export function TableSkeleton({ rows = 5, cols = 4 }: TableSkeletonProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 max-w-[120px]" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="border-b border-gray-100 px-4 py-3 flex gap-4 items-center"
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              className={cn(
                'h-4 flex-1',
                colIdx === 0 ? 'max-w-[180px]' : 'max-w-[120px]',
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── CardSkeleton ─────────────────────────────────────────────────────────────

export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-3">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="pt-2 flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  )
}

// ─── DetailSkeleton ───────────────────────────────────────────────────────────

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header block */}
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex gap-2 ml-4">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Body sections */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-5 w-40" />
          </div>
        ))}
      </div>

      {/* Table area */}
      <div className="pt-2">
        <Skeleton className="h-5 w-32 mb-3" />
        <TableSkeleton rows={3} cols={4} />
      </div>
    </div>
  )
}
