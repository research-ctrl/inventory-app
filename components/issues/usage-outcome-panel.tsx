'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { UsageOutcomeSchema } from '@/lib/validations/issue'
import type { UsageOutcomeInput } from '@/lib/validations/issue'
import { captureUsageOutcome } from '@/actions/issues'
import { useOperator } from '@/hooks/use-operator'

interface UsageOutcomePanelProps {
  issueId: string
  quantity: number
  unit: string
  onSuccess?: () => void
}

const OUTCOME_OPTIONS = [
  {
    value: 'not_used' as const,
    label: 'Not Used',
    description: 'Material was not used — return to stores',
    color: 'blue',
    borderClass: 'border-blue-200 bg-blue-50 ring-blue-300',
    activeClass: 'border-blue-500 ring-2 ring-blue-400 bg-blue-50',
    labelClass: 'text-blue-800',
    descClass: 'text-blue-600',
  },
  {
    value: 'leftover' as const,
    label: 'Leftover',
    description: 'Partially used — returning unused remainder',
    color: 'amber',
    borderClass: 'border-amber-200 bg-amber-50 ring-amber-300',
    activeClass: 'border-amber-500 ring-2 ring-amber-400 bg-amber-50',
    labelClass: 'text-amber-800',
    descClass: 'text-amber-600',
  },
  {
    value: 'scrap' as const,
    label: 'Scrap',
    description: 'Material was consumed or scrapped — no return',
    color: 'red',
    borderClass: 'border-red-200 bg-red-50 ring-red-300',
    activeClass: 'border-red-500 ring-2 ring-red-400 bg-red-50',
    labelClass: 'text-red-800',
    descClass: 'text-red-600',
  },
]

export default function UsageOutcomePanel({
  issueId,
  quantity,
  unit,
  onSuccess,
}: UsageOutcomePanelProps) {
  const { operator } = useOperator()
  const [selectedOutcome, setSelectedOutcome] = useState<'not_used' | 'leftover' | 'scrap' | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UsageOutcomeInput>({
    resolver: zodResolver(UsageOutcomeSchema),
    defaultValues: {
      issue_id: issueId,
      outcome: undefined,
      outcome_notes: '',
      quantity_returning: quantity,
      quantity_scrapped: quantity,
    },
  })

  function handleOutcomeSelect(value: 'not_used' | 'leftover' | 'scrap') {
    setSelectedOutcome(value)
    setValue('outcome', value)
    if (value === 'not_used') {
      setValue('quantity_returning', quantity)
    } else if (value === 'scrap') {
      setValue('quantity_scrapped', quantity)
      setValue('quantity_returning', 0)
    } else {
      setValue('quantity_returning', 0)
    }
  }

  async function onSubmit(data: UsageOutcomeInput) {
    if (!operator?.id) {
      toast.error('Operator identity not set.')
      return
    }
    setSubmitting(true)
    try {
      const result = await captureUsageOutcome(data, operator.id)
      if (!result.success) {
        toast.error(result.error ?? 'Failed to capture outcome')
        return
      }
      toast.success('Usage outcome recorded')
      onSuccess?.()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <input type="hidden" {...register('issue_id')} />

      {/* Outcome cards */}
      <div className="grid grid-cols-3 gap-3">
        {OUTCOME_OPTIONS.map((opt) => {
          const isSelected = selectedOutcome === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleOutcomeSelect(opt.value)}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                isSelected ? opt.activeClass : `${opt.borderClass} hover:ring-1`
              }`}
            >
              <p className={`font-semibold text-sm ${opt.labelClass}`}>{opt.label}</p>
              <p className={`text-xs mt-1 ${opt.descClass}`}>{opt.description}</p>
            </button>
          )
        })}
      </div>
      {errors.outcome && (
        <p className="text-xs text-red-600">{errors.outcome.message}</p>
      )}

      {/* Conditional fields */}
      {selectedOutcome && (
        <div className="space-y-4 pt-2 border-t border-gray-100">
          {(selectedOutcome === 'not_used' || selectedOutcome === 'leftover') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity Returning <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  step="any"
                  min="0"
                  max={quantity}
                  {...register('quantity_returning')}
                  className="w-40 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">
                  {unit} <span className="text-gray-400">(issued: {quantity})</span>
                </span>
              </div>
              {errors.quantity_returning && (
                <p className="mt-1 text-xs text-red-600">{errors.quantity_returning.message}</p>
              )}
            </div>
          )}

          {selectedOutcome === 'scrap' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity Scrapped
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  step="any"
                  min="0"
                  max={quantity}
                  {...register('quantity_scrapped')}
                  className="w-40 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">
                  {unit} <span className="text-gray-400">(issued: {quantity})</span>
                </span>
              </div>
              {errors.quantity_scrapped && (
                <p className="mt-1 text-xs text-red-600">{errors.quantity_scrapped.message}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              {...register('outcome_notes')}
              rows={2}
              placeholder="Additional context about the outcome…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !operator?.id}
              className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Saving…
                </span>
              ) : (
                'Record Outcome'
              )}
            </button>
          </div>
        </div>
      )}
    </form>
  )
}
