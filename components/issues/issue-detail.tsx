'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/shared/status-badge'
import { useOperator } from '@/hooks/use-operator'
import {
  submitIssue,
  approveIssue,
  rejectIssue,
  issueMaterial,
} from '@/actions/issues'
import UsageOutcomePanel from './usage-outcome-panel'
import Link from 'next/link'

interface IssueDetailProps {
  issue: {
    id: string
    issue_number: string
    status: string
    quantity: number
    quantity_returned: number
    unit: string
    purpose: string
    work_order: string | null
    expected_return_date: string | null
    created_at: string
    usage_outcome: string | null
    outcome_notes: string | null
    outcome_captured_at: string | null
    pin: { pin_number: string; description: string; category: string | null }
    issued_to_profile: { full_name: string | null; role: string }
    issued_by_profile: { full_name: string | null } | null
    approved_by_profile: { full_name: string | null } | null
    vessel: { name: string } | null
    recoveries: Array<{ id: string; recovery_ref: string; status: string; outcome: string | null }>
  }
  workflowHistory: any[]
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function IssueDetail({ issue, workflowHistory }: IssueDetailProps) {
  const { operator } = useOperator()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rejectComment, setRejectComment] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [showOutcomePanel, setShowOutcomePanel] = useState(false)

  function requireOperator(): string | null {
    if (!operator?.id) {
      toast.error('Operator identity not set.')
      return null
    }
    return operator.id
  }

  function handleSubmit() {
    const opId = requireOperator()
    if (!opId) return
    startTransition(async () => {
      const result = await submitIssue(issue.id, opId)
      if (result.success) {
        toast.success('Submitted for approval')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to submit')
      }
    })
  }

  function handleApprove() {
    const opId = requireOperator()
    if (!opId) return
    startTransition(async () => {
      const result = await approveIssue(issue.id, opId)
      if (result.success) {
        toast.success('Issue approved')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to approve')
      }
    })
  }

  function handleReject() {
    const opId = requireOperator()
    if (!opId) return
    startTransition(async () => {
      const result = await rejectIssue(issue.id, opId, rejectComment || undefined)
      if (result.success) {
        toast.success('Issue rejected')
        setShowRejectInput(false)
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to reject')
      }
    })
  }

  function handleIssueMaterial() {
    const opId = requireOperator()
    if (!opId) return
    startTransition(async () => {
      const result = await issueMaterial(issue.id, opId)
      if (result.success) {
        toast.success('Material issued — stock deducted')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to issue material')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Status header + action buttons */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <StatusBadge status={issue.status} />
            <span className="text-sm text-gray-500">
              Created {formatDateTime(issue.created_at)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {issue.status === 'draft' && (
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Submit for Approval
              </button>
            )}

            {issue.status === 'pending_approval' && !showRejectInput && (
              <>
                <button
                  onClick={() => setShowRejectInput(true)}
                  disabled={isPending}
                  className="px-4 py-2 border border-red-200 text-red-700 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isPending}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
              </>
            )}

            {issue.status === 'approved' && (
              <button
                onClick={handleIssueMaterial}
                disabled={isPending}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Issue Material
              </button>
            )}

            {issue.status === 'issued' && !issue.usage_outcome && !showOutcomePanel && (
              <button
                onClick={() => setShowOutcomePanel(true)}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700"
              >
                Capture Usage Outcome
              </button>
            )}
          </div>
        </div>

        {/* Reject input */}
        {showRejectInput && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200 space-y-3">
            <label className="block text-sm font-medium text-red-800">
              Rejection reason (optional)
            </label>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              rows={2}
              placeholder="Provide a reason for rejection…"
              className="w-full rounded-md border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowRejectInput(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isPending}
                className="px-4 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Issue Details</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
          <InfoRow
            label="PIN"
            value={
              <span className="font-mono text-xs">
                {issue.pin.pin_number}{' '}
                <span className="font-sans font-normal text-gray-600">— {issue.pin.description}</span>
              </span>
            }
          />
          <InfoRow label="Category" value={issue.pin.category} />
          <InfoRow
            label="Issued To"
            value={`${issue.issued_to_profile.full_name ?? 'Unknown'} (${issue.issued_to_profile.role})`}
          />
          <InfoRow label="Vessel" value={issue.vessel?.name} />
          <InfoRow label="Work Order" value={issue.work_order} />
          <InfoRow
            label="Quantity"
            value={`${issue.quantity} ${issue.unit}`}
          />
          {issue.quantity_returned > 0 && (
            <InfoRow label="Returned" value={`${issue.quantity_returned} ${issue.unit}`} />
          )}
          <InfoRow label="Expected Return" value={formatDate(issue.expected_return_date)} />
          <InfoRow
            label="Approved By"
            value={issue.approved_by_profile?.full_name}
          />
          <InfoRow
            label="Issued By"
            value={issue.issued_by_profile?.full_name}
          />
          <div className="col-span-2 sm:col-span-3">
            <InfoRow label="Purpose" value={issue.purpose} />
          </div>
        </dl>
      </div>

      {/* Usage outcome capture panel */}
      {showOutcomePanel && issue.status === 'issued' && !issue.usage_outcome && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Capture Usage Outcome</h2>
          <UsageOutcomePanel
            issueId={issue.id}
            quantity={issue.quantity}
            unit={issue.unit}
            onSuccess={() => {
              setShowOutcomePanel(false)
              router.refresh()
            }}
          />
        </div>
      )}

      {/* Usage outcome result (if captured) */}
      {issue.usage_outcome && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Usage Outcome</h2>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
            <InfoRow
              label="Outcome"
              value={
                <span
                  className={`inline-flex px-2 py-0.5 text-xs rounded font-medium ${
                    issue.usage_outcome === 'scrap'
                      ? 'bg-red-100 text-red-700'
                      : issue.usage_outcome === 'leftover'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {issue.usage_outcome.replace('_', ' ')}
                </span>
              }
            />
            <InfoRow label="Captured At" value={formatDateTime(issue.outcome_captured_at)} />
            {issue.outcome_notes && (
              <div className="col-span-2 sm:col-span-3">
                <InfoRow label="Notes" value={issue.outcome_notes} />
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Related recoveries */}
      {issue.recoveries.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Related Recoveries</h2>
          <div className="divide-y divide-gray-100">
            {issue.recoveries.map((rec) => (
              <div key={rec.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-gray-700">{rec.recovery_ref}</span>
                  <StatusBadge status={rec.status} />
                </div>
                {rec.outcome && (
                  <span className="text-xs text-gray-500">{rec.outcome}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workflow history */}
      {workflowHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Workflow History</h2>
          <ol className="space-y-3">
            {workflowHistory.map((h: any) => (
              <li key={h.id} className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-gray-300 shrink-0" />
                <div>
                  <p className="text-sm text-gray-800">
                    <span className="font-medium capitalize">{h.event?.replace('_', ' ')}</span>
                    {h.from_status && h.to_status && (
                      <span className="text-gray-500">
                        {' '}· {h.from_status} → {h.to_status}
                      </span>
                    )}
                  </p>
                  {h.comment && (
                    <p className="text-xs text-gray-500 mt-0.5">{h.comment}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {h.actor?.full_name ?? 'Unknown'} · {formatDateTime(h.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
