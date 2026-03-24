'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Package } from 'lucide-react'
import { CreateDeliverySchema, type CreateDeliveryInput } from '@/lib/validations/delivery'
import { createDelivery } from '@/actions/deliveries'

interface PoItemRow {
  id: string
  line_number: number
  description: string
  part_number?: string | null
  quantity: number
  unit: string
}

interface DeliveryFormProps {
  poId: string
  poNumber: string
  vendorName?: string
  poItems?: PoItemRow[]
  storeLocations?: Array<{ id: string; code: string; name: string }>
}

const inputCls =
  'mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
const labelCls = 'block text-sm font-medium text-gray-700'
const errorCls = 'mt-1 text-xs text-red-600'

export default function DeliveryForm({
  poId,
  poNumber,
  vendorName,
  poItems = [],
  storeLocations = [],
}: DeliveryFormProps) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const defaultItems = poItems.length
    ? poItems.map((item) => ({
        po_item_id: item.id,
        line_number: item.line_number,
        description: item.description,
        part_number: item.part_number ?? '',
        quantity_expected: item.quantity,
        quantity_received: item.quantity, // Default to full receipt
        unit: item.unit,
        condition_notes: '',
      }))
    : [
        {
          po_item_id: undefined,
          line_number: 1,
          description: '',
          part_number: '',
          quantity_expected: 1,
          quantity_received: 1,
          unit: 'pcs',
          condition_notes: '',
        },
      ]

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateDeliveryInput>({
    resolver: zodResolver(CreateDeliverySchema) as any,
    defaultValues: {
      po_id: poId,
      supplier_delivery_note: '',
      tracking_number: '',
      carrier: '',
      expected_date: null,
      receiving_location_id: null,
      notes: '',
      items: defaultItems,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    setIsSubmitting(true)
    try {
      const result = await createDelivery(values)
      if (result?.error) {
        setServerError(typeof result.error === 'string' ? result.error : JSON.stringify(result.error))
        return
      }
      router.push('/procurement/deliveries')
    } catch (e: any) {
      setServerError(e.message ?? 'An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* PO Context */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 flex items-center gap-3">
        <Package className="h-5 w-5 text-blue-600 shrink-0" />
        <div className="text-sm text-blue-900">
          Recording delivery for <strong>{poNumber}</strong>
          {vendorName && <> from <strong>{vendorName}</strong></>}
        </div>
      </div>

      {/* Delivery Details */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Delivery Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input type="hidden" {...register('po_id')} />

          <div>
            <label className={labelCls}>Supplier Delivery Note</label>
            <input
              type="text"
              {...register('supplier_delivery_note')}
              placeholder="Supplier's DO / consignment note"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Tracking Number</label>
            <input
              type="text"
              {...register('tracking_number')}
              placeholder="e.g. TRK-12345"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Carrier / Courier</label>
            <input
              type="text"
              {...register('carrier')}
              placeholder="e.g. DHL, FedEx"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Expected Date</label>
            <input type="date" {...register('expected_date')} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Receiving Location</label>
            <select {...register('receiving_location_id')} className={inputCls}>
              <option value="">— Select store location —</option>
              {storeLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  [{loc.code}] {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Notes</label>
            <textarea rows={2} {...register('notes')} className={inputCls} placeholder="Any additional delivery notes…" />
          </div>
        </div>
      </section>

      {/* Items */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Items Received <span className="text-red-500">*</span>
          </h2>
          {!poItems.length && (
            <button
              type="button"
              onClick={() =>
                append({ line_number: fields.length + 1, description: '', part_number: '', quantity_expected: 1, quantity_received: 1, unit: 'pcs', condition_notes: '' })
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              + Add Item
            </button>
          )}
        </div>

        {errors.items && !Array.isArray(errors.items) && (
          <p className={errorCls}>{(errors.items as any).message}</p>
        )}

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500">#</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Description *</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Part No.</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">Expected Qty</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">Received Qty *</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Unit</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Condition Notes</th>
                {!poItems.length && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {fields.map((field, index) => (
                <tr key={field.id} className={
                  // Highlight if received < expected
                  ''
                }>
                  <td className="px-3 py-2 text-gray-400">{index + 1}</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      {...register(`items.${index}.description`)}
                      readOnly={!!poItems.length}
                      className={`w-full min-w-[160px] rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${poItems.length ? 'bg-gray-50 cursor-default' : ''}`}
                    />
                    {errors.items?.[index]?.description && (
                      <p className="mt-0.5 text-xs text-red-600">{errors.items[index]?.description?.message}</p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      {...register(`items.${index}.part_number`)}
                      readOnly={!!poItems.length}
                      className={`w-full min-w-[90px] rounded border border-gray-200 px-2 py-1 text-sm ${poItems.length ? 'bg-gray-50 cursor-default' : ''}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      {...register(`items.${index}.quantity_expected`, { valueAsNumber: true })}
                      readOnly={!!poItems.length}
                      className={`w-20 rounded border border-gray-200 px-2 py-1 text-sm text-right ${poItems.length ? 'bg-gray-50 cursor-default' : ''}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      {...register(`items.${index}.quantity_received`, { valueAsNumber: true })}
                      className="w-20 rounded border border-gray-200 px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {errors.items?.[index]?.quantity_received && (
                      <p className="mt-0.5 text-xs text-red-600">{errors.items[index]?.quantity_received?.message}</p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      {...register(`items.${index}.unit`)}
                      readOnly={!!poItems.length}
                      className={`w-16 rounded border border-gray-200 px-2 py-1 text-sm ${poItems.length ? 'bg-gray-50 cursor-default' : ''}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      {...register(`items.${index}.condition_notes`)}
                      placeholder="Any damage / condition notes"
                      className="w-full min-w-[140px] rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  {!poItems.length && (
                    <td className="px-3 py-2">
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600 text-xs">
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {poItems.length > 0 && (
          <p className="text-xs text-gray-500">
            Items are pre-filled from the PO. Adjust <strong>Received Qty</strong> if this is a partial delivery.
          </p>
        )}
      </section>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
        >
          {isSubmitting ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Package className="h-4 w-4" />
          )}
          Record Delivery
        </button>
      </div>
    </form>
  )
}
