'use client'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { toast } from 'sonner'
import { IntakeDeliverySchema } from '@/lib/validations/inventory'
import type { IntakeDeliveryInput } from '@/lib/validations/inventory'
import { intakeDelivery } from '@/actions/inventory'
import { useOperator } from '@/hooks/use-operator'

interface AcceptedItem {
  id: string
  description: string
  part_number: string | null
  quantity_received: number
  accepted_qty: number
  unit: string
}

interface IntakeFormProps {
  delivery: {
    id: string
    delivery_ref: string
    inspection_id: string
    accepted_items: AcceptedItem[]
  }
  locations: Array<{ id: string; code: string; name: string; warehouse: string }>
  categories: string[]
  onSuccess?: (pins: any[]) => void
}

export default function IntakeForm({
  delivery,
  locations,
  categories,
  onSuccess,
}: IntakeFormProps) {
  const { operator } = useOperator()
  const [createdPins, setCreatedPins] = useState<any[] | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<IntakeDeliveryInput>({
    resolver: zodResolver(IntakeDeliverySchema),
    defaultValues: {
      delivery_id: delivery.id,
      inspection_id: delivery.inspection_id,
      items: delivery.accepted_items.map((item) => ({
        delivery_item_id: item.id,
        description: item.description,
        part_number: item.part_number ?? '',
        category: '',
        unit: item.unit,
        quantity: item.accepted_qty,
        location_id: '',
        unit_cost: undefined,
        origin_reference: delivery.inspection_id,
      })),
    },
  })

  const { fields } = useFieldArray({ control, name: 'items' })

  async function onSubmit(data: IntakeDeliveryInput) {
    if (!operator?.id) {
      toast.error('Operator identity not set. Please select an operator.')
      return
    }
    setSubmitting(true)
    try {
      const result = await intakeDelivery(data, operator.id)
      if (!result.success) {
        toast.error(result.error ?? 'Failed to create PINs')
        return
      }
      setCreatedPins(result.data ?? [])
      toast.success(`${result.data?.length ?? 0} PIN(s) created successfully`)
      onSuccess?.(result.data ?? [])
    } finally {
      setSubmitting(false)
    }
  }

  if (createdPins) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900">
            {createdPins.length} PIN{createdPins.length !== 1 ? 's' : ''} Generated
          </h3>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 divide-y divide-green-100">
          {createdPins.map((pin) => (
            <div key={pin.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <span className="font-mono text-sm font-semibold text-green-800">
                  {pin.pin_number}
                </span>
                <span className="ml-3 text-sm text-gray-700">{pin.description}</span>
              </div>
              <div className="text-sm text-gray-500">
                Qty: <span className="font-medium text-gray-800">{pin.initial_stock}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <input type="hidden" {...register('delivery_id')} />
      <input type="hidden" {...register('inspection_id')} />

      <div className="space-y-4">
        {fields.map((field, idx) => {
          const item = delivery.accepted_items[idx]
          const itemErrors = errors.items?.[idx]
          return (
            <div
              key={field.id}
              className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                  Item {idx + 1}
                </span>
                <span className="text-xs text-gray-500">
                  Received: {item.quantity_received} {item.unit} / Accepted: {item.accepted_qty}{' '}
                  {item.unit}
                </span>
              </div>

              <input type="hidden" {...register(`items.${idx}.delivery_item_id`)} />
              <input type="hidden" {...register(`items.${idx}.origin_reference`)} />

              <div className="grid grid-cols-2 gap-4">
                {/* Description */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register(`items.${idx}.description`)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {itemErrors?.description && (
                    <p className="mt-1 text-xs text-red-600">{itemErrors.description.message}</p>
                  )}
                </div>

                {/* Part Number */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Part Number
                  </label>
                  <input
                    {...register(`items.${idx}.part_number`)}
                    placeholder="Optional"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register(`items.${idx}.category`)}
                    list={`categories-${idx}`}
                    placeholder="Select or type…"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <datalist id={`categories-${idx}`}>
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  {itemErrors?.category && (
                    <p className="mt-1 text-xs text-red-600">{itemErrors.category.message}</p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Storage Location <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register(`items.${idx}.location_id`)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select location…</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.code} — {loc.name} ({loc.warehouse})
                      </option>
                    ))}
                  </select>
                  {itemErrors?.location_id && (
                    <p className="mt-1 text-xs text-red-600">{itemErrors.location_id.message}</p>
                  )}
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      {...register(`items.${idx}.quantity`)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-500 shrink-0">{item.unit}</span>
                  </div>
                  {itemErrors?.quantity && (
                    <p className="mt-1 text-xs text-red-600">{itemErrors.quantity.message}</p>
                  )}
                </div>

                {/* Unit */}
                <input type="hidden" {...register(`items.${idx}.unit`)} />

                {/* Unit Cost */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Unit Cost (optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register(`items.${idx}.unit_cost`)}
                    placeholder="0.00"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {fields.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">
          No accepted items for this delivery.
        </p>
      )}

      {fields.length > 0 && (
        <div className="flex justify-end">
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
                Generating PINs…
              </span>
            ) : (
              `Generate ${fields.length} PIN${fields.length !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      )}
    </form>
  )
}
