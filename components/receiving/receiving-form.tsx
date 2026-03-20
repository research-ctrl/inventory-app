'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useOperator } from '@/hooks/use-operator'
import { markDeliveryReceived } from '@/actions/receiving'
import { ANONYMOUS_OPERATOR_ID } from '@/lib/operator'

type DeliveryItem = {
  id: string
  description: string
  part_number: string | null
  quantity_expected: number
  quantity_received: number
  unit: string
}

type Location = {
  id: string
  code: string
  name: string
}

type Props = {
  delivery: {
    id: string
    delivery_ref: string
    delivery_items: DeliveryItem[]
  }
  locations: Location[]
  onSuccess?: () => void
}

type ItemState = {
  quantity_received: string
  condition_notes: string
}

export function ReceivingForm({ delivery, locations, onSuccess }: Props) {
  const { operator } = useOperator()
  const router = useRouter()

  // Initialise each item with previously received qty or 0
  const [items, setItems] = useState<Record<string, ItemState>>(() => {
    const init: Record<string, ItemState> = {}
    for (const item of delivery.delivery_items) {
      init[item.id] = {
        quantity_received: item.quantity_received > 0
          ? String(item.quantity_received)
          : String(item.quantity_expected),
        condition_notes: '',
      }
    }
    return init
  })

  const [locationId, setLocationId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateItem = (id: string, field: keyof ItemState, value: string) => {
    setItems(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  const markAllReceived = () => {
    const next: Record<string, ItemState> = {}
    for (const item of delivery.delivery_items) {
      next[item.id] = {
        quantity_received: String(item.quantity_expected),
        condition_notes: items[item.id]?.condition_notes ?? '',
      }
    }
    setItems(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const operatorId = operator?.id ?? ANONYMOUS_OPERATOR_ID

    // Validate quantities
    for (const item of delivery.delivery_items) {
      const val = parseFloat(items[item.id]?.quantity_received ?? '0')
      if (isNaN(val) || val < 0) {
        setError(`Invalid quantity for item: ${item.description}`)
        return
      }
    }

    const payload = delivery.delivery_items.map(item => ({
      delivery_item_id: item.id,
      quantity_received: parseFloat(items[item.id]?.quantity_received ?? '0'),
      condition_notes: items[item.id]?.condition_notes || undefined,
    }))

    setSubmitting(true)
    try {
      const result = await markDeliveryReceived(
        delivery.id,
        payload,
        locationId || undefined,
        operatorId
      )
      if (!result.success) {
        setError(result.error ?? 'Failed to mark delivery received')
        return
      }
      toast.success('Delivery marked as received')
      if (onSuccess) {
        onSuccess()
      } else {
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message ?? 'Unexpected error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Items table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Item / Part No.
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                Expected
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                Received Qty
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Condition Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {delivery.delivery_items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  No items on this delivery
                </td>
              </tr>
            ) : (
              delivery.delivery_items.map(item => {
                const receivedVal = parseFloat(items[item.id]?.quantity_received ?? '0')
                const overReceived = !isNaN(receivedVal) && receivedVal > item.quantity_expected
                return (
                  <tr key={item.id} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.description}</p>
                      {item.part_number && (
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{item.part_number}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 font-mono">
                      {item.quantity_expected} <span className="text-gray-400 text-xs">{item.unit}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={items[item.id]?.quantity_received ?? ''}
                          onChange={e => updateItem(item.id, 'quantity_received', e.target.value)}
                          className={`w-24 rounded-md border px-2 py-1.5 text-right text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            overReceived
                              ? 'border-orange-300 bg-orange-50 focus:ring-orange-400'
                              : 'border-gray-300'
                          }`}
                        />
                        <span className="text-xs text-gray-400">{item.unit}</span>
                      </div>
                      {overReceived && (
                        <p className="text-xs text-orange-600 text-right mt-0.5">Over expected</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        placeholder="Optional notes…"
                        value={items[item.id]?.condition_notes ?? ''}
                        onChange={e => updateItem(item.id, 'condition_notes', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mark all received shortcut */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={markAllReceived}
          className="text-sm text-blue-600 hover:text-blue-800 underline-offset-2 hover:underline"
        >
          Mark all received (fill expected qty)
        </button>
      </div>

      {/* Location selector */}
      {locations.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Receiving Location <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <select
            value={locationId}
            onChange={e => setLocationId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Select location —</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>
                {loc.code} — {loc.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Operator attribution */}
      {operator && (
        <p className="text-xs text-gray-400">
          Recording as: <span className="font-medium text-gray-600">{operator.name}</span>
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
          disabled={submitting || delivery.delivery_items.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {submitting ? 'Saving…' : 'Mark Delivery Received'}
        </button>
      </div>
    </form>
  )
}
