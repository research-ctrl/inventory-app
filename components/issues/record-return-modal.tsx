'use client'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { X, Send } from 'lucide-react'
import { CreateRecoverySchema, type CreateRecoveryInput } from '@/lib/validations/recovery'
import { createRecovery } from '@/actions/recovery'

interface RecordReturnModalProps {
  issue: {
    id: string
    pin_id: string
    quantity: number
    quantity_returned: number
    unit: string
    issue_number: string
  }
  onClose: () => void
  onSuccess: () => void
}

export default function RecordReturnModal({ issue, onClose, onSuccess }: RecordReturnModalProps) {
  const [isPending, startTransition] = useTransition()
  const maxReturnable = issue.quantity - issue.quantity_returned

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateRecoveryInput>({
    resolver: zodResolver(CreateRecoverySchema),
    defaultValues: {
      issue_id: issue.id,
      pin_id: issue.pin_id,
      quantity_returned: maxReturnable,
      condition_notes: '',
    },
  })

  const onSubmit = (data: CreateRecoveryInput) => {
    startTransition(async () => {
      const result = await createRecovery(data)
      if (result.success) {
        toast.success('Return recorded. Pending assessment.')
        onSuccess()
      } else {
        toast.error(result.error ?? 'Failed to record return')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Record Return</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700">
            Recording return for <strong>{issue.issue_number}</strong>.
            Remaining to return: {maxReturnable} {issue.unit}.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity Returned <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.001"
                max={maxReturnable}
                {...register('quantity_returned', { valueAsNumber: true })}
                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <span className="text-sm text-gray-400">{issue.unit}</span>
              </div>
            </div>
            {errors.quantity_returned && (
              <p className="mt-1 text-xs text-red-600">{errors.quantity_returned.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition Notes / Initial Remark
            </label>
            <textarea
              {...register('condition_notes')}
              rows={3}
              placeholder="e.g. Scuffed but working, needs cleaning, etc."
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Record Return
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
