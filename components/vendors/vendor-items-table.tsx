'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, X, Check, ToggleLeft, ToggleRight } from 'lucide-react'
import { createVendorItem, updateVendorItem, deleteVendorItem, toggleVendorItemActive, type VendorItemInput } from '@/actions/vendor-items'

type VendorItem = {
  id: string
  vendor_id: string
  description: string
  part_number: string | null
  vendor_part_number: string | null
  category: string | null
  unit: string
  unit_price: number
  currency: string
  lead_time_days: number | null
  transport_cost: number | null
  min_order_qty: number | null
  notes: string | null
  is_active: boolean
}

interface VendorItemsTableProps {
  items: VendorItem[]
  vendorId: string
  canEdit: boolean
}

const BLANK_FORM: Omit<VendorItemInput, 'vendor_id'> = {
  description: '',
  part_number: null,
  vendor_part_number: null,
  category: null,
  unit: 'EA',
  unit_price: 0,
  currency: 'USD',
  lead_time_days: null,
  transport_cost: null,
  min_order_qty: null,
  notes: null,
}

export function VendorItemsTable({ items: initialItems, vendorId, canEdit }: VendorItemsTableProps) {
  const [items, setItems]           = useState(initialItems)
  const [showForm, setShowForm]     = useState(false)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [formData, setFormData]     = useState<Omit<VendorItemInput, 'vendor_id'>>(BLANK_FORM)
  const [error, setError]           = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const inputCls = 'rounded border border-gray-200 px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-500'

  const resetForm = () => {
    setFormData(BLANK_FORM)
    setShowForm(false)
    setEditingId(null)
    setError(null)
  }

  const handleSave = () => {
    startTransition(async () => {
      setError(null)
      if (editingId) {
        const res = await updateVendorItem(editingId, formData)
        if (!res.success) { setError(res.error as string); return }
        setItems((prev) => prev.map((i) => i.id === editingId ? { ...i, ...formData } : i))
      } else {
        const res = await createVendorItem({ ...formData, vendor_id: vendorId })
        if (!res.success) { setError(res.error as string); return }
        if (res.data) setItems((prev) => [...prev, res.data as VendorItem])
      }
      resetForm()
    })
  }

  const handleEdit = (item: VendorItem) => {
    setFormData({
      description: item.description,
      part_number: item.part_number,
      vendor_part_number: item.vendor_part_number,
      category: item.category,
      unit: item.unit,
      unit_price: item.unit_price,
      currency: item.currency,
      lead_time_days: item.lead_time_days,
      transport_cost: item.transport_cost,
      min_order_qty: item.min_order_qty,
      notes: item.notes,
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    if (!confirm('Delete this catalog item? This cannot be undone.')) return
    startTransition(async () => {
      await deleteVendorItem(id, vendorId)
      setItems((prev) => prev.filter((i) => i.id !== id))
    })
  }

  const handleToggle = (item: VendorItem) => {
    startTransition(async () => {
      await toggleVendorItemActive(item.id, !item.is_active, vendorId)
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_active: !item.is_active } : i))
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {canEdit && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => { resetForm(); setShowForm(true) }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-blue-900">
            {editingId ? 'Edit Catalog Item' : 'Add Catalog Item'}
          </h4>
          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-0.5">Description *</label>
              <input className={inputCls} value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} placeholder="Item description" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">Part No. (our ref)</label>
              <input className={inputCls} value={formData.part_number ?? ''} onChange={(e) => setFormData((p) => ({ ...p, part_number: e.target.value || null }))} placeholder="Optional" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">Vendor Part No.</label>
              <input className={inputCls} value={formData.vendor_part_number ?? ''} onChange={(e) => setFormData((p) => ({ ...p, vendor_part_number: e.target.value || null }))} placeholder="Optional" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">Category</label>
              <input className={inputCls} value={formData.category ?? ''} onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value || null }))} placeholder="e.g. Mechanical" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">Unit</label>
              <input className={inputCls} value={formData.unit} onChange={(e) => setFormData((p) => ({ ...p, unit: e.target.value }))} placeholder="EA" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">Unit Price *</label>
              <input type="number" min={0} step="0.01" className={inputCls} value={formData.unit_price} onChange={(e) => setFormData((p) => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">Currency</label>
              <select className={inputCls} value={formData.currency} onChange={(e) => setFormData((p) => ({ ...p, currency: e.target.value }))}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="SGD">SGD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">Lead Time (days)</label>
              <input type="number" min={0} className={inputCls} value={formData.lead_time_days ?? ''} onChange={(e) => setFormData((p) => ({ ...p, lead_time_days: e.target.value ? parseInt(e.target.value) : null }))} placeholder="e.g. 14" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">Transport Cost</label>
              <input type="number" min={0} step="0.01" className={inputCls} value={formData.transport_cost ?? ''} onChange={(e) => setFormData((p) => ({ ...p, transport_cost: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">Min. Order Qty</label>
              <input type="number" min={0} className={inputCls} value={formData.min_order_qty ?? ''} onChange={(e) => setFormData((p) => ({ ...p, min_order_qty: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="1" />
            </div>
            <div className="lg:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-0.5">Notes</label>
              <input className={inputCls} value={formData.notes ?? ''} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value || null }))} placeholder="Optional notes" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={handleSave} disabled={isPending || !formData.description}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              <Check className="h-3.5 w-3.5" /> Save
            </button>
            <button type="button" onClick={resetForm}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Items table */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center text-sm text-gray-400">
          No catalog items yet.{canEdit ? ' Click "Add Item" to get started.' : ''}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Part No.</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Category</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Unit Price</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Unit</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Lead (days)</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Active</th>
                {canEdit && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {items.map((item) => (
                <tr key={item.id} className={item.is_active ? '' : 'opacity-50'}>
                  <td className="px-3 py-2.5 text-gray-900 font-medium">{item.description}</td>
                  <td className="px-3 py-2.5 font-mono text-gray-500 text-xs">{item.part_number ?? '—'}</td>
                  <td className="px-3 py-2.5 text-gray-500">{item.category ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">
                    {item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })} {item.currency}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">{item.unit}</td>
                  <td className="px-3 py-2.5 text-right text-gray-600">{item.lead_time_days ?? '—'}</td>
                  <td className="px-3 py-2.5 text-center">
                    {canEdit ? (
                      <button type="button" onClick={() => handleToggle(item)} disabled={isPending}
                        className="text-gray-400 hover:text-blue-600 disabled:opacity-50">
                        {item.is_active
                          ? <ToggleRight className="h-5 w-5 text-green-500" />
                          : <ToggleLeft className="h-5 w-5" />}
                      </button>
                    ) : (
                      item.is_active
                        ? <span className="text-green-600 text-xs font-medium">Yes</span>
                        : <span className="text-gray-400 text-xs">No</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => handleEdit(item)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => handleDelete(item.id)} disabled={isPending}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
