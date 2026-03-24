'use client'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CreateIssueSchema } from '@/lib/validations/issue'
import type { CreateIssueInput } from '@/lib/validations/issue'
import { createIssue, submitIssue } from '@/actions/issues'
import { useOperator } from '@/hooks/use-operator'

interface PinOption {
  pin_id: string
  pin_number: string
  description: string
  current_stock: number
  unit: string
  location_code: string | null
}

interface ProfileOption {
  id: string
  full_name: string | null
  role: string
}

interface VesselOption {
  id: string
  name: string
}

interface IssueFormProps {
  pins: PinOption[]
  profiles: ProfileOption[]
  vessels: VesselOption[]
  onSuccess?: (issue: any) => void
}

export default function IssueForm({ pins, profiles, vessels, onSuccess }: IssueFormProps) {
  const { operator } = useOperator()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [selectedPin, setSelectedPin] = useState<PinOption | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateIssueInput>({
    resolver: zodResolver(CreateIssueSchema),
    defaultValues: {
      pin_id: '',
      issued_to: '',
      vessel_id: null,
      work_order: '',
      quantity: 1,
      unit: '',
      purpose: '',
      expected_return_date: null,
    },
  })

  const watchedPinId = watch('pin_id')

  function handlePinChange(pinId: string) {
    const pin = pins.find((p) => p.pin_id === pinId) ?? null
    setSelectedPin(pin)
    setValue('pin_id', pinId)
    if (pin) setValue('unit', pin.unit)
  }

  async function onSubmit(data: CreateIssueInput) {
    if (!operator?.id) {
      toast.error('Operator identity not set.')
      return
    }
    setSubmitting(true)
    try {
      // Create draft issue
      const createResult = await createIssue(data, operator.id)
      if (!createResult.success) {
        toast.error(createResult.error ?? 'Failed to create issue')
        return
      }

      // Immediately submit for approval
      const submitResult = await submitIssue(createResult.data.id, operator.id)
      if (!submitResult.success) {
        toast.error(submitResult.error ?? 'Created but failed to submit for approval')
      } else {
        toast.success(`Issue ${createResult.data.issue_number} submitted for approval`)
      }

      if (onSuccess) {
        onSuccess(createResult.data)
      } else {
        router.push(`/issued/${createResult.data.id}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* PIN selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Material (PIN) <span className="text-red-500">*</span>
        </label>
        <select
          value={watchedPinId}
          onChange={(e) => handlePinChange(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select a PIN…</option>
          {pins.map((pin) => (
            <option key={pin.pin_id} value={pin.pin_id}>
              {pin.pin_number} — {pin.description} (Stock: {pin.current_stock} {pin.unit}
              {pin.location_code ? ` @ ${pin.location_code}` : ''})
            </option>
          ))}
        </select>
        {errors.pin_id && (
          <p className="mt-1 text-xs text-red-600">{errors.pin_id.message}</p>
        )}
        {selectedPin && (
          <p className="mt-1 text-xs text-gray-500">
            Available: <span className="font-medium">{selectedPin.current_stock} {selectedPin.unit}</span>
            {selectedPin.location_code && ` · Location: ${selectedPin.location_code}`}
          </p>
        )}
      </div>

      {/* Issued To */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Issued To <span className="text-red-500">*</span>
        </label>
        <select
          {...register('issued_to')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select recipient…</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name ?? 'Unnamed'} ({p.role})
            </option>
          ))}
        </select>
        {errors.issued_to && (
          <p className="mt-1 text-xs text-red-600">{errors.issued_to.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Vessel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vessel <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <select
            {...register('vessel_id')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">No vessel</option>
            {vessels.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        {/* Work Order */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Work Order <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            {...register('work_order')}
            placeholder="WO-12345"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              step="any"
              min="0.001"
              {...register('quantity')}
              max={selectedPin?.current_stock}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {selectedPin && (
              <span className="text-sm text-gray-500 shrink-0">{selectedPin.unit}</span>
            )}
          </div>
          {errors.quantity && (
            <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>
          )}
          {selectedPin && (
            <p className="mt-1 text-xs text-gray-400">
              Max: {selectedPin.current_stock}
            </p>
          )}
        </div>

        {/* Expected Return Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expected Return <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="date"
            {...register('expected_return_date')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Unit hidden */}
      <input type="hidden" {...register('unit')} />

      {/* Purpose */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Purpose <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register('purpose')}
          rows={3}
          placeholder="Describe how this material will be used…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
        {errors.purpose && (
          <p className="mt-1 text-xs text-red-600">{errors.purpose.message}</p>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={submitting || !operator?.id}
          className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Creating Issue…
            </span>
          ) : (
            'Create & Submit for Approval'
          )}
        </button>
      </div>
    </form>
  )
}
