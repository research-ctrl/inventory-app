'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Package, Search, X, CheckCircle2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { addStockDirectly, type DirectStockItem } from '@/actions/inventory'
import { searchInventoryPins } from '@/actions/inventory-search'

const inputClass = 'block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

interface Props {
  locations: Array<{ id: string; code: string; name: string; warehouse: string }>
  vendors: Array<{ id: string; name: string }>
  categories: string[]
  prefillVendorId?: string
  prefillVendorName?: string
  prefillReference?: string
}

interface ItemRow {
  key: string
  // linked existing PIN
  pin_id?: string
  pin_number?: string
  // fields
  description: string
  part_number: string
  category: string
  unit: string
  quantity: string
  unit_cost: string
  location_id: string
  vendor_id: string
  notes: string
  // search state
  searchQuery: string
  searchResults: any[]
  searching: boolean
  dropdownOpen: boolean
}

function newRow(vendorId = '', locationId = ''): ItemRow {
  return {
    key: Math.random().toString(36).slice(2),
    description: '',
    part_number: '',
    category: '',
    unit: 'pcs',
    quantity: '',
    unit_cost: '',
    location_id: locationId,
    vendor_id: vendorId,
    notes: '',
    searchQuery: '',
    searchResults: [],
    searching: false,
    dropdownOpen: false,
  }
}

export default function AddStockClient({
  locations,
  vendors,
  categories,
  prefillVendorId = '',
  prefillReference = '',
}: Props) {
  const router = useRouter()
  const [reference, setReference] = useState(prefillReference ?? '')
  const [rows, setRows] = useState<ItemRow[]>([newRow(prefillVendorId, locations[0]?.id ?? '')])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const searchTimers = useRef<Record<string, NodeJS.Timeout>>({})

  const updateRow = (key: string, patch: Partial<ItemRow>) => {
    setRows(rs => rs.map(r => r.key === key ? { ...r, ...patch } : r))
  }

  const handleSearch = useCallback((key: string, q: string) => {
    updateRow(key, { searchQuery: q, dropdownOpen: true })
    if (searchTimers.current[key]) clearTimeout(searchTimers.current[key])
    if (q.trim().length < 2) { updateRow(key, { searchResults: [], searching: false }); return }
    updateRow(key, { searching: true })
    searchTimers.current[key] = setTimeout(async () => {
      const results = await searchInventoryPins(q)
      updateRow(key, { searchResults: results, searching: false, dropdownOpen: true })
    }, 300)
  }, [])

  const linkPin = (key: string, pin: any) => {
    updateRow(key, {
      pin_id: pin.id,
      pin_number: pin.pin_number,
      description: pin.description,
      part_number: pin.part_number ?? '',
      unit: pin.unit ?? 'pcs',
      searchQuery: pin.description,
      dropdownOpen: false,
      searching: false,
    })
  }

  const unlinkPin = (key: string) => {
    updateRow(key, {
      pin_id: undefined,
      pin_number: undefined,
      searchQuery: '',
      searchResults: [],
    })
  }

  const addRow = () => {
    const last = rows[rows.length - 1]
    setRows(rs => [...rs, newRow(last?.vendor_id ?? prefillVendorId, last?.location_id ?? locations[0]?.id ?? '')])
  }

  const removeRow = (key: string) => setRows(rs => rs.filter(r => r.key !== key))

  const handleSubmit = async () => {
    setError(null)

    const items: DirectStockItem[] = []
    for (const row of rows) {
      if (!row.description.trim()) { setError('All items need a description'); return }
      if (!row.quantity || Number(row.quantity) <= 0) { setError('All items need a quantity > 0'); return }
      if (!row.location_id) { setError('Please select a location for every item'); return }
      if (!row.unit.trim()) { setError('Please set a unit for every item'); return }
      items.push({
        pin_id: row.pin_id,
        description: row.description.trim(),
        part_number: row.part_number.trim() || undefined,
        category: row.category.trim() || undefined,
        unit: row.unit.trim(),
        quantity: Number(row.quantity),
        unit_cost: row.unit_cost ? Number(row.unit_cost) : undefined,
        location_id: row.location_id,
        vendor_id: row.vendor_id || undefined,
        notes: row.notes.trim() || undefined,
      })
    }

    setSaving(true)
    const result = await addStockDirectly(items, reference.trim() || undefined)
    setSaving(false)

    if (!result.success) {
      setError(result.error ?? 'Failed to add stock')
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-7 w-7 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Stock Added Successfully</h2>
        <p className="text-sm text-gray-500">{rows.length} item{rows.length !== 1 ? 's' : ''} added to inventory.</p>
        <div className="flex gap-3 justify-center pt-2">
          <Link href="/inventory" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Package className="h-4 w-4" /> View Inventory
          </Link>
          <button
            onClick={() => { setDone(false); setRows([newRow(prefillVendorId, locations[0]?.id ?? '')]); setReference(prefillReference ?? '') }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Add More
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/inventory" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Add Stock to Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            For items received outside the PO flow — direct purchases, enquiry results, opening stock
          </p>
        </div>
      </div>

      {/* Reference */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <label className={labelClass}>Reference / Source <span className="text-gray-400">(optional)</span></label>
        <input
          type="text"
          value={reference}
          onChange={e => setReference(e.target.value)}
          placeholder="e.g. External purchase, Enquiry REQ-000123, Opening stock, Supplier invoice INV-001"
          className={inputClass}
        />
        <p className="text-xs text-gray-400 mt-1">This will be recorded on all transactions created below.</p>
      </div>

      {/* Item rows */}
      <div className="space-y-4">
        {rows.map((row, idx) => (
          <ItemRowCard
            key={row.key}
            row={row}
            idx={idx}
            locations={locations}
            vendors={vendors}
            categories={categories}
            onUpdate={(patch) => updateRow(row.key, patch)}
            onSearch={(q) => handleSearch(row.key, q)}
            onLinkPin={(pin) => linkPin(row.key, pin)}
            onUnlinkPin={() => unlinkPin(row.key)}
            onRemove={rows.length > 1 ? () => removeRow(row.key) : undefined}
          />
        ))}
      </div>

      {/* Add row */}
      <button
        type="button"
        onClick={addRow}
        className="w-full rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-400 hover:border-blue-300 hover:text-blue-600 flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Another Item
      </button>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {saving ? (
            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {saving ? 'Adding to Inventory…' : `Add ${rows.length} Item${rows.length !== 1 ? 's' : ''} to Inventory`}
        </button>
        <Link href="/inventory" className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </Link>
      </div>
    </div>
  )
}

// ─── Individual item row card ──────────────────────────────────────────────────

function ItemRowCard({
  row, idx, locations, vendors, categories,
  onUpdate, onSearch, onLinkPin, onUnlinkPin, onRemove,
}: {
  row: ItemRow
  idx: number
  locations: Array<{ id: string; code: string; name: string; warehouse: string }>
  vendors: Array<{ id: string; name: string }>
  categories: string[]
  onUpdate: (p: Partial<ItemRow>) => void
  onSearch: (q: string) => void
  onLinkPin: (pin: any) => void
  onUnlinkPin: () => void
  onRemove?: () => void
}) {
  const searchRef = useRef<HTMLDivElement>(null)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Item {idx + 1}</span>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search existing PIN */}
      <div ref={searchRef} className="relative">
        <label className={labelClass}>
          Search Existing Inventory PIN
          <span className="ml-1 font-normal text-gray-400">(optional — or create new below)</span>
        </label>
        {row.pin_id ? (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
            <span className="font-mono text-xs font-bold text-green-800 bg-green-100 px-1.5 py-0.5 rounded border border-green-200">
              {row.pin_number}
            </span>
            <span className="text-sm text-green-900 flex-1">{row.description}</span>
            <button type="button" onClick={onUnlinkPin} className="text-green-500 hover:text-red-500">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className={`flex items-center rounded-lg border ${row.dropdownOpen ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-200'} bg-white`}>
            <Search className="ml-3 h-4 w-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={row.searchQuery}
              onChange={e => onSearch(e.target.value)}
              onFocus={() => row.searchQuery.length >= 2 && onUpdate({ dropdownOpen: true })}
              placeholder="Type to search existing PINs…"
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder-gray-400"
            />
            {row.searching && <span className="mr-3 h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />}
            {row.searchQuery && !row.searching && (
              <button type="button" onClick={() => onUpdate({ searchQuery: '', searchResults: [], dropdownOpen: false })} className="mr-2 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {row.dropdownOpen && !row.pin_id && row.searchQuery.length >= 2 && (
          <div className="absolute z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-xl max-h-48 overflow-y-auto">
            {row.searchResults.length > 0 ? (
              row.searchResults.map((pin: any) => (
                <button
                  key={pin.id} type="button"
                  onMouseDown={() => onLinkPin(pin)}
                  className="w-full text-left px-3 py-2.5 hover:bg-green-50 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                      {pin.pin_number}
                    </span>
                    <span className="text-sm text-gray-900 truncate">{pin.description}</span>
                    <span className="ml-auto text-xs text-gray-400">{pin.current_stock} in stock</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">No match — a new PIN will be created</div>
            )}
          </div>
        )}
      </div>

      {/* Description + Part No */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className={labelClass}>Description <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={row.description}
            onChange={e => onUpdate({ description: e.target.value })}
            placeholder="Item description"
            className={inputClass}
            disabled={!!row.pin_id}
          />
        </div>
        <div>
          <label className={labelClass}>Part / Model No.</label>
          <input
            type="text"
            value={row.part_number}
            onChange={e => onUpdate({ part_number: e.target.value })}
            placeholder="Optional"
            className={inputClass}
            disabled={!!row.pin_id}
          />
        </div>
      </div>

      {/* Qty, Unit, Cost */}
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className={labelClass}>Qty Received <span className="text-red-500">*</span></label>
          <input
            type="number" min={0.01} step="any"
            value={row.quantity}
            onChange={e => onUpdate({ quantity: e.target.value })}
            placeholder="0"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Unit <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={row.unit}
            onChange={e => onUpdate({ unit: e.target.value })}
            placeholder="pcs"
            className={inputClass}
            disabled={!!row.pin_id}
          />
        </div>
        <div>
          <label className={labelClass}>Unit Cost</label>
          <input
            type="number" min={0} step="0.01"
            value={row.unit_cost}
            onChange={e => onUpdate({ unit_cost: e.target.value })}
            placeholder="0.00"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <input
            type="text"
            value={row.category}
            onChange={e => onUpdate({ category: e.target.value })}
            placeholder="e.g. Electrical"
            list={`categories-${idx}`}
            className={inputClass}
            disabled={!!row.pin_id}
          />
          <datalist id={`categories-${idx}`}>
            {categories.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>
      </div>

      {/* Location + Vendor */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Store Location <span className="text-red-500">*</span></label>
          <select
            value={row.location_id}
            onChange={e => onUpdate({ location_id: e.target.value })}
            className={inputClass}
          >
            <option value="">— Select location —</option>
            {locations.map(l => (
              <option key={l.id} value={l.id}>{l.code} – {l.name} ({l.warehouse})</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Vendor / Supplier</label>
          <select
            value={row.vendor_id}
            onChange={e => onUpdate({ vendor_id: e.target.value })}
            className={inputClass}
          >
            <option value="">— None / Unknown —</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={labelClass}>Item Notes</label>
        <input
          type="text"
          value={row.notes}
          onChange={e => onUpdate({ notes: e.target.value })}
          placeholder="Condition, batch number, any remarks…"
          className={inputClass}
        />
      </div>
    </div>
  )
}
