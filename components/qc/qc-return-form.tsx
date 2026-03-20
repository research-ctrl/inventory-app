'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { useOperator } from '@/hooks/use-operator'
import { createQCReturn } from '@/actions/qc'
import { ANONYMOUS_OPERATOR_ID } from '@/lib/operator'

type Props = {
  inspectionId: string
  deliveryId: string
  vendorId?: string
  poId?: string
  rejectedQuantity: number
  onSuccess?: () => void
}

export default function QCReturnForm({
  inspectionId,
  deliveryId,
  vendorId,
  poId,
  rejectedQuantity,
  onSuccess,
}: Props) {
  const { operator } = useOperator()

  const [quantityReturned, setQuantityReturned] = useState<string>(String(rejectedQuantity))
  const [returnReason, setReturnReason] = useState('')
  const [returnNotes, setReturnNotes] = useState('')
  const [replacementExpected, setReplacementExpected] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const operatorId = operator?.id ?? ANONYMOUS_OPERATOR_ID

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const qty = parseFloat(quantityReturned)
    if (isNaN(qty) || qty <= 0) {
      setError('Quantity returned must be a positive number')
      return
    }
    if (!returnReason.trim()) {
      setError('Return reason is required')
      return
    }

    setSubmitting(true)
    try {
      const result = await createQCReturn(
        {
          inspection_id: inspectionId,
          delivery_id: deliveryId,
          vendor_id: vendorId,
          po_id: poId,
          quantity_returned: qty,
          return_reason: returnReason.trim(),
          return_notes: returnNotes.trim() || undefined,
          replacement_expected: replacementExpected || null,
        },
        operatorId
      )

      if (!result.success) {
        setError(result.error ?? 'Failed to create return')
        return
      }

      toast.success('Vendor return created successfully')
      setSubmitted(true)
      onSuccess?.()
    } catch (err: any) {
      setError(err.message ?? 'Unexpected error')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-4 text-sm text-green-800">
        Vendor return record created. Track progress in the{' '}
        <a href="/qc/returns" className="underline font-medium hover:text-green-900">
          Returns register
        </a>
        .
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Quantity returned */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity to Return <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0.001"
            step="0.001"
            value={quantityReturned}
            onChange={e => setQuantityReturned(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-0.5">
            Rejected qty: {rejectedQuantity}
          </p>
        </div>

        {/* Replacement expected date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Replacement Expected <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="date"
            value={replacementExpected}
            onChange={e => setReplacementExpected(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Return reason */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Return Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={3}
          value={returnReason}
          onChange={e => setReturnReason(e.target.value)}
          placeholder="Describe why this material is being returned to the vendor…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Return notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Additional Notes <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          rows={2}
          value={returnNotes}
          onChange={e => setReturnNotes(e.target.value)}
          placeholder="Shipping instructions, contact details, RMA reference…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Operator attribution */}
      {operator && (
        <p className="text-xs text-gray-400">
          Raised by: <span className="font-medium text-gray-600">{operator.name}</span>
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {submitting ? 'Creating Return…' : 'Create Vendor Return'}
        </button>
      </div>
    </form>
  )
}
