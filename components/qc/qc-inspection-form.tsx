'use client'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useOperator } from '@/hooks/use-operator'
import { startInspection, submitInspectionResult } from '@/actions/qc'
import { ANONYMOUS_OPERATOR_ID } from '@/lib/operator'
import type { QCItemResultInput } from '@/lib/validations/qc'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DeliveryItem = {
  id: string
  description: string
  part_number: string | null
  quantity_expected: number
  quantity_received: number
  unit: string
}

type Defect = {
  defect_code: string
  description: string
  severity: 'minor' | 'major' | 'critical'
  quantity_affected: string
  disposition: 'return_to_vendor' | 'scrap' | 'accept_on_deviation' | 'rework'
}

type ItemResultState = {
  accepted_qty: string
  rejected_qty: string
  defects: Defect[]
  showDefectForm: boolean
  pendingDefect: Defect
}

type Props = {
  delivery: {
    id: string
    delivery_ref: string
    po_number?: string
    vendor_name?: string
    delivery_items: DeliveryItem[]
  }
  existingInspection?: { id: string; status: string; result: string | null }
  onSuccess?: (result: { result: string; accepted: number; rejected: number }) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const blankDefect = (): Defect => ({
  defect_code: '',
  description: '',
  severity: 'minor',
  quantity_affected: '1',
  disposition: 'return_to_vendor',
})

function buildInitialItemState(items: DeliveryItem[]): Record<string, ItemResultState> {
  const state: Record<string, ItemResultState> = {}
  for (const item of items) {
    const qty = item.quantity_received > 0 ? item.quantity_received : item.quantity_expected
    state[item.id] = {
      accepted_qty: String(qty),
      rejected_qty: '0',
      defects: [],
      showDefectForm: false,
      pendingDefect: blankDefect(),
    }
  }
  return state
}

function computeOverallResult(itemStates: Record<string, ItemResultState>) {
  let totalAccepted = 0
  let totalRejected = 0
  for (const s of Object.values(itemStates)) {
    totalAccepted += parseFloat(s.accepted_qty) || 0
    totalRejected += parseFloat(s.rejected_qty) || 0
  }
  let result: 'pass' | 'fail' | 'conditional'
  if (totalRejected === 0) result = 'pass'
  else if (totalAccepted === 0) result = 'fail'
  else result = 'conditional'
  return { result, totalAccepted, totalRejected }
}

const RESULT_BADGE: Record<string, string> = {
  pass: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300',
  fail: 'bg-red-100 text-red-800 ring-1 ring-red-300',
  conditional: 'bg-orange-100 text-orange-800 ring-1 ring-orange-300',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QCInspectionForm({ delivery, existingInspection, onSuccess }: Props) {
  const { operator } = useOperator()

  // Phase 1 — start inspection
  const [phase, setPhase] = useState<'start' | 'inspect'>(
    existingInspection ? 'inspect' : 'start'
  )
  const [inspectionId, setInspectionId] = useState<string | null>(
    existingInspection?.id ?? null
  )
  const [startRemarks, setStartRemarks] = useState('')
  const [passCriteria, setPassCriteria] = useState('')
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  // Phase 2 — submit results
  const [itemStates, setItemStates] = useState<Record<string, ItemResultState>>(
    () => buildInitialItemState(delivery.delivery_items)
  )
  const [overallRemarks, setOverallRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const operatorId = operator?.id ?? ANONYMOUS_OPERATOR_ID

  // -------------------------------------------------------------------------
  // Phase 1 — start inspection
  // -------------------------------------------------------------------------

  const handleStartInspection = async (e: React.FormEvent) => {
    e.preventDefault()
    setStartError(null)
    setStarting(true)
    try {
      const result = await startInspection(
        {
          delivery_id: delivery.id,
          remarks: startRemarks || undefined,
          pass_criteria: passCriteria || undefined,
        },
        operatorId
      )
      if (!result.success) {
        setStartError(result.error ?? 'Failed to start inspection')
        return
      }
      setInspectionId(result.data?.id ?? null)
      toast.success('Inspection started')
      setPhase('inspect')
    } catch (err: any) {
      setStartError(err.message ?? 'Unexpected error')
    } finally {
      setStarting(false)
    }
  }

  // -------------------------------------------------------------------------
  // Phase 2 — item result editing
  // -------------------------------------------------------------------------

  const updateItemField = useCallback(
    (itemId: string, field: 'accepted_qty' | 'rejected_qty', value: string) => {
      setItemStates(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], [field]: value },
      }))
    },
    []
  )

  const toggleDefectForm = useCallback((itemId: string, show: boolean) => {
    setItemStates(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], showDefectForm: show },
    }))
  }, [])

  const updatePendingDefect = useCallback(
    (itemId: string, field: keyof Defect, value: string) => {
      setItemStates(prev => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          pendingDefect: { ...prev[itemId].pendingDefect, [field]: value },
        },
      }))
    },
    []
  )

  const addDefect = useCallback((itemId: string) => {
    setItemStates(prev => {
      const state = prev[itemId]
      if (!state.pendingDefect.description.trim()) return prev
      return {
        ...prev,
        [itemId]: {
          ...state,
          defects: [...state.defects, { ...state.pendingDefect }],
          pendingDefect: blankDefect(),
          showDefectForm: false,
        },
      }
    })
  }, [])

  const removeDefect = useCallback((itemId: string, idx: number) => {
    setItemStates(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        defects: prev[itemId].defects.filter((_, i) => i !== idx),
      },
    }))
  }, [])

  // -------------------------------------------------------------------------
  // Phase 2 — submit
  // -------------------------------------------------------------------------

  const handleSubmitResults = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inspectionId) {
      setSubmitError('No active inspection. Start inspection first.')
      return
    }
    setSubmitError(null)

    // Build payload
    const items: QCItemResultInput[] = delivery.delivery_items.map(item => {
      const state = itemStates[item.id]
      return {
        delivery_item_id: item.id,
        description: item.description,
        quantity_expected: item.quantity_expected,
        accepted_qty: parseFloat(state.accepted_qty) || 0,
        rejected_qty: parseFloat(state.rejected_qty) || 0,
        defects: state.defects.map(d => ({
          defect_code: d.defect_code || undefined,
          description: d.description,
          severity: d.severity,
          quantity_affected: parseFloat(d.quantity_affected) || 1,
          disposition: d.disposition,
        })),
      }
    })

    setSubmitting(true)
    try {
      const result = await submitInspectionResult(
        { inspection_id: inspectionId, items, overall_remarks: overallRemarks || undefined },
        operatorId
      )
      if (!result.success) {
        setSubmitError(result.error ?? 'Failed to submit inspection')
        return
      }
      const { totalAccepted, totalRejected, result: qcResult } = result.data
      toast.success(`Inspection submitted — ${qcResult.toUpperCase()}`)
      onSuccess?.({ result: qcResult, accepted: totalAccepted, rejected: totalRejected })
    } catch (err: any) {
      setSubmitError(err.message ?? 'Unexpected error')
    } finally {
      setSubmitting(false)
    }
  }

  // -------------------------------------------------------------------------
  // Preview result badge
  // -------------------------------------------------------------------------

  const preview = computeOverallResult(itemStates)

  // =========================================================================
  // Render — Phase 1: Start Inspection
  // =========================================================================

  if (phase === 'start') {
    return (
      <form onSubmit={handleStartInspection} className="space-y-5 max-w-lg">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Start Inspection</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {delivery.vendor_name} — {delivery.delivery_ref}
            {delivery.po_number && ` (PO ${delivery.po_number})`}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pass Criteria <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={passCriteria}
            onChange={e => setPassCriteria(e.target.value)}
            placeholder="e.g. All items within tolerance per spec IPC-A-610"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Initial Remarks <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            rows={3}
            value={startRemarks}
            onChange={e => setStartRemarks(e.target.value)}
            placeholder="Visual condition of shipment, packaging notes…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {operator && (
          <p className="text-xs text-gray-400">
            Inspector: <span className="font-medium text-gray-600">{operator.name}</span>
          </p>
        )}

        {startError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {startError}
          </div>
        )}

        <button
          type="submit"
          disabled={starting}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {starting && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {starting ? 'Starting…' : 'Begin Inspection'}
        </button>
      </form>
    )
  }

  // =========================================================================
  // Render — Phase 2: Item Results
  // =========================================================================

  return (
    <form onSubmit={handleSubmitResults} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Record Inspection Results</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          {delivery.vendor_name} — {delivery.delivery_ref}
        </p>
      </div>

      {/* Per-item result table */}
      <div className="space-y-4">
        {delivery.delivery_items.map(item => {
          const state = itemStates[item.id]
          const accepted = parseFloat(state.accepted_qty) || 0
          const rejected = parseFloat(state.rejected_qty) || 0
          const total = accepted + rejected
          const expected = item.quantity_received > 0 ? item.quantity_received : item.quantity_expected
          const overTotal = total > expected + 0.001

          return (
            <div
              key={item.id}
              className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50"
            >
              {/* Item header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">{item.description}</p>
                  {item.part_number && (
                    <p className="text-xs text-gray-400 font-mono">{item.part_number}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">
                    Expected: <span className="font-mono font-medium">{expected}</span>{' '}
                    <span className="text-gray-400">{item.unit}</span>
                  </p>
                </div>
                {/* Mini result indicator */}
                {rejected > 0 ? (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 ring-1 ring-red-200 whitespace-nowrap">
                    {rejected} rejected
                  </span>
                ) : (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 whitespace-nowrap">
                    All accepted
                  </span>
                )}
              </div>

              {/* Qty inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Accepted Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={state.accepted_qty}
                    onChange={e => updateItemField(item.id, 'accepted_qty', e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Rejected Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={state.rejected_qty}
                    onChange={e => updateItemField(item.id, 'rejected_qty', e.target.value)}
                    className="w-full rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              </div>

              {/* Over-quantity warning */}
              {overTotal && (
                <p className="text-xs text-orange-600 bg-orange-50 rounded px-2 py-1">
                  Accepted + Rejected ({total}) exceeds expected ({expected}). Please verify.
                </p>
              )}

              {/* Defects list */}
              {state.defects.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-600">Defects recorded:</p>
                  {state.defects.map((d, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2"
                    >
                      <span
                        className={`mt-0.5 text-xs font-semibold px-1.5 py-0.5 rounded ${
                          d.severity === 'critical'
                            ? 'bg-red-200 text-red-800'
                            : d.severity === 'major'
                            ? 'bg-orange-200 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {d.severity}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{d.description}</p>
                        <p className="text-xs text-gray-500">
                          Qty: {d.quantity_affected} — {d.disposition.replace(/_/g, ' ')}
                          {d.defect_code && ` (${d.defect_code})`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDefect(item.id, idx)}
                        className="text-gray-400 hover:text-red-600 text-sm leading-none mt-0.5"
                        aria-label="Remove defect"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add defect toggle */}
              {rejected > 0 && !state.showDefectForm && (
                <button
                  type="button"
                  onClick={() => toggleDefectForm(item.id, true)}
                  className="text-sm text-red-600 hover:text-red-800 underline-offset-2 hover:underline"
                >
                  + Add Defect Record
                </button>
              )}

              {/* Pending defect form */}
              {state.showDefectForm && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-red-800">Add Defect</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Defect Code <span className="text-gray-400">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={state.pendingDefect.defect_code}
                        onChange={e => updatePendingDefect(item.id, 'defect_code', e.target.value)}
                        placeholder="e.g. D-001"
                        className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Qty Affected
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={state.pendingDefect.quantity_affected}
                        onChange={e =>
                          updatePendingDefect(item.id, 'quantity_affected', e.target.value)
                        }
                        className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={state.pendingDefect.description}
                      onChange={e => updatePendingDefect(item.id, 'description', e.target.value)}
                      placeholder="Describe the defect…"
                      className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Severity
                      </label>
                      <select
                        value={state.pendingDefect.severity}
                        onChange={e =>
                          updatePendingDefect(
                            item.id,
                            'severity',
                            e.target.value as Defect['severity']
                          )
                        }
                        className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                      >
                        <option value="minor">Minor</option>
                        <option value="major">Major</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Disposition
                      </label>
                      <select
                        value={state.pendingDefect.disposition}
                        onChange={e =>
                          updatePendingDefect(
                            item.id,
                            'disposition',
                            e.target.value as Defect['disposition']
                          )
                        }
                        className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                      >
                        <option value="return_to_vendor">Return to Vendor</option>
                        <option value="scrap">Scrap</option>
                        <option value="accept_on_deviation">Accept on Deviation</option>
                        <option value="rework">Rework</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => addDefect(item.id)}
                      disabled={!state.pendingDefect.description.trim()}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleDefectForm(item.id, false)}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Overall remarks */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Overall Remarks <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          rows={3}
          value={overallRemarks}
          onChange={e => setOverallRemarks(e.target.value)}
          placeholder="Summary observations, overall assessment…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Result preview */}
      <div className="flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
        <span className="text-sm text-gray-600">Predicted result:</span>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
            RESULT_BADGE[preview.result] ?? 'bg-gray-100 text-gray-700'
          }`}
        >
          {preview.result.toUpperCase()}
        </span>
        <span className="text-xs text-gray-400 ml-auto">
          {preview.totalAccepted} accepted · {preview.totalRejected} rejected
        </span>
      </div>

      {/* Operator attribution */}
      {operator && (
        <p className="text-xs text-gray-400">
          Inspector: <span className="font-medium text-gray-600">{operator.name}</span>
        </p>
      )}

      {/* Error */}
      {submitError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || delivery.delivery_items.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {submitting ? 'Submitting…' : 'Submit Inspection Result'}
        </button>
      </div>
    </form>
  )
}
