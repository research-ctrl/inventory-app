'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle, AlertCircle, Activity, Loader2 } from 'lucide-react'
import { getUserActivity } from '@/actions/admin'

type Tab = 'history' | 'pending'

interface HistoryRow {
  id: string
  entity_type: string
  entity_id: string
  from_status: string | null
  to_status: string
  event: string
  comment: string | null
  created_at: string
}

interface PendingRow {
  id: string
  entity_type: string
  entity_id: string
  status: string
  due_date: string | null
  created_at: string
  comment: string | null
  requirement?: { ref_number: string; title: string; status: string } | null
}

interface Props {
  userId: string
  userName: string
  onClose: () => void
}

const STATUS_COLORS: Record<string, string> = {
  approved:           'text-green-700 bg-green-50 border-green-200',
  rejected:           'text-red-700 bg-red-50 border-red-200',
  pending_approval:   'text-amber-700 bg-amber-50 border-amber-200',
  draft:              'text-gray-600 bg-gray-50 border-gray-200',
  in_progress:        'text-blue-700 bg-blue-50 border-blue-200',
  ordered:            'text-purple-700 bg-purple-50 border-purple-200',
  delivered:          'text-teal-700 bg-teal-50 border-teal-200',
  closed:             'text-gray-500 bg-gray-50 border-gray-200',
  cancelled:          'text-red-500 bg-red-50 border-red-100',
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? 'text-gray-600 bg-gray-50 border-gray-200'
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

function EntityTypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    requirement:   'REQ',
    purchase_order: 'PO',
    delivery:      'DEL',
    qc_inspection: 'QC',
  }
  return (
    <span className="text-[10px] font-mono font-bold text-gray-400">
      {labels[type] ?? type.toUpperCase()}
    </span>
  )
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

export function UserActivityModal({ userId, userName, onClose }: Props) {
  const [tab, setTab]           = useState<Tab>('history')
  const [page, setPage]         = useState(1)
  const [data, setData]         = useState<any[]>([])
  const [total, setTotal]       = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [error, setError]       = useState<string | null>(null)
  const [isPending, start]      = useTransition()

  const load = useCallback((t: Tab, p: number) => {
    setError(null)
    start(async () => {
      const result = await getUserActivity(userId, t, p)
      if (!result.success) {
        setError(result.error ?? 'Failed to load activity')
        return
      }
      setData(result.data)
      setTotal(result.total)
      setPageSize(result.pageSize)
    })
  }, [userId])

  useEffect(() => { load(tab, page) }, [tab, page, load])

  function switchTab(t: Tab) {
    setTab(t)
    setPage(1)
    setData([])
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Activity className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-gray-900">{userName}</p>
              <p className="text-[11px] text-gray-400">User Activity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-100 px-6 flex-shrink-0">
          {(['history', 'pending'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t === 'history' ? 'Activity History' : 'Pending Actions'}
              {tab === t && total > 0 && (
                <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 font-semibold">
                  {total}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isPending && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            </div>
          )}

          {error && !isPending && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!isPending && !error && data.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-400">
                {tab === 'history'
                  ? 'No activity recorded yet.'
                  : 'No pending actions — all caught up!'}
              </p>
            </div>
          )}

          {/* History rows */}
          {!isPending && tab === 'history' && data.length > 0 && (
            <div className="space-y-2">
              {(data as HistoryRow[]).map((row) => (
                <div
                  key={row.id}
                  className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <EntityTypeLabel type={row.entity_type} />
                      {row.from_status && (
                        <>
                          <StatusBadge status={row.from_status} />
                          <span className="text-gray-300 text-xs">→</span>
                        </>
                      )}
                      <StatusBadge status={row.to_status} />
                    </div>
                    {row.comment && (
                      <p className="mt-1 text-xs text-gray-500 italic truncate">"{row.comment}"</p>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 flex-shrink-0 text-right">
                    {fmt(row.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Pending rows */}
          {!isPending && tab === 'pending' && data.length > 0 && (
            <div className="space-y-2">
              {(data as PendingRow[]).map((row) => {
                const overdue = isOverdue(row.due_date)
                return (
                  <div
                    key={row.id}
                    className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
                      overdue
                        ? 'border-red-200 bg-red-50/60'
                        : 'border-amber-200 bg-amber-50/60'
                    }`}
                  >
                    {overdue
                      ? <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      : <Clock className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <EntityTypeLabel type={row.entity_type} />
                        {row.requirement && (
                          <span className="text-xs font-semibold text-gray-800 truncate">
                            {row.requirement.ref_number} — {row.requirement.title}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <StatusBadge status={row.status} />
                        {row.due_date && (
                          <span className={`text-[10px] font-medium ${overdue ? 'text-red-600' : 'text-amber-600'}`}>
                            {overdue ? 'Overdue since' : 'Due'} {fmtDate(row.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <XCircle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pagination footer */}
        {total > pageSize && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3 flex-shrink-0">
            <p className="text-xs text-gray-500">
              Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isPending}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-3 text-xs font-medium text-gray-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || isPending}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
