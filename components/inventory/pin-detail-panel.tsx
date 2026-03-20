'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/shared/status-badge'
import TransactionLog from './transaction-log'
import { useOperator } from '@/hooks/use-operator'
import { adjustStock, transferPin, scrapPin, holdPin, releaseHold } from '@/actions/inventory'
import { AdjustStockSchema, TransferPinSchema } from '@/lib/validations/inventory'
import type { AdjustStockInput, TransferPinInput } from '@/lib/validations/inventory'
import Link from 'next/link'

interface PinDetailPanelProps {
  pin: any
  currentStock: number
  transactions: any[]
  issues: any[]
  originDelivery: any
  locations?: Array<{ id: string; code: string; name: string; warehouse: string }>
}

type ActiveModal = null | 'adjust' | 'transfer' | 'scrap' | 'hold'

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ---- Adjust Stock Modal ----
function AdjustModal({
  pin,
  currentStock,
  onClose,
  onDone,
}: {
  pin: any
  currentStock: number
  onClose: () => void
  onDone: () => void
}) {
  const { operator } = useOperator()
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdjustStockInput>({
    resolver: zodResolver(AdjustStockSchema),
    defaultValues: { pin_id: pin.id, quantity: 0, reason: '' },
  })

  async function onSubmit(data: AdjustStockInput) {
    if (!operator?.id) { toast.error('Operator identity not set.'); return }
    setSubmitting(true)
    const result = await adjustStock(data, operator.id)
    setSubmitting(false)
    if (result.success) { toast.success('Stock adjusted'); onDone() }
    else toast.error(result.error ?? 'Failed')
  }

  return (
    <ModalShell title="Adjust Stock" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register('pin_id')} />
        <div className="text-sm text-gray-600">
          Current stock: <span className="font-semibold">{currentStock} {pin.unit}</span>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Adjustment Qty <span className="text-gray-400">(positive = add, negative = remove)</span>
          </label>
          <input
            type="number"
            step="any"
            {...register('quantity')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {errors.quantity && <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Reason *</label>
          <input {...register('reason')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason.message}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
          <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50">
            {submitting ? 'Saving…' : 'Apply Adjustment'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

// ---- Transfer Modal ----
function TransferModal({
  pin,
  currentStock,
  locations,
  onClose,
  onDone,
}: {
  pin: any
  currentStock: number
  locations: Array<{ id: string; code: string; name: string; warehouse: string }>
  onClose: () => void
  onDone: () => void
}) {
  const { operator } = useOperator()
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TransferPinInput>({
    resolver: zodResolver(TransferPinSchema),
    defaultValues: {
      pin_id: pin.id,
      quantity: currentStock,
      from_location_id: pin.location_id ?? '',
      to_location_id: '',
      notes: '',
    },
  })

  async function onSubmit(data: TransferPinInput) {
    if (!operator?.id) { toast.error('Operator identity not set.'); return }
    setSubmitting(true)
    const result = await transferPin(data, operator.id)
    setSubmitting(false)
    if (result.success) { toast.success('PIN transferred'); onDone() }
    else toast.error(result.error ?? 'Failed')
  }

  return (
    <ModalShell title="Transfer Location" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register('pin_id')} />
        <input type="hidden" {...register('from_location_id')} />
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
          <input type="number" step="any" min="0.001" max={currentStock} {...register('quantity')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          {errors.quantity && <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To Location *</label>
          <select {...register('to_location_id')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">Select location…</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.code} — {loc.name} ({loc.warehouse})
              </option>
            ))}
          </select>
          {errors.to_location_id && <p className="mt-1 text-xs text-red-600">{errors.to_location_id.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <input {...register('notes')} placeholder="Optional" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
          <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50">
            {submitting ? 'Transferring…' : 'Transfer'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

// ---- Scrap Modal ----
function ScrapModal({
  pin,
  currentStock,
  onClose,
  onDone,
}: {
  pin: any
  currentStock: number
  onClose: () => void
  onDone: () => void
}) {
  const { operator } = useOperator()
  const [qty, setQty] = useState(currentStock)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!operator?.id) { toast.error('Operator identity not set.'); return }
    if (!reason.trim()) { toast.error('Reason is required'); return }
    setSubmitting(true)
    const result = await scrapPin(pin.id, qty, reason, operator.id)
    setSubmitting(false)
    if (result.success) { toast.success('Stock written off'); onDone() }
    else toast.error(result.error ?? 'Failed')
  }

  return (
    <ModalShell title="Write Off / Scrap" onClose={onClose}>
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          Current stock: <span className="font-semibold">{currentStock} {pin.unit}</span>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Quantity to Scrap *</label>
          <input type="number" step="any" min="0.001" max={currentStock} value={qty}
            onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Reason *</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg disabled:opacity-50">
            {submitting ? 'Writing Off…' : 'Write Off'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

// ---- Hold Modal ----
function HoldModal({
  pin,
  onClose,
  onDone,
}: {
  pin: any
  onClose: () => void
  onDone: () => void
}) {
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setSubmitting(true)
    const result = await holdPin(pin.id, notes)
    setSubmitting(false)
    if (result.success) { toast.success('PIN placed on hold'); onDone() }
    else toast.error(result.error ?? 'Failed')
  }

  return (
    <ModalShell title="Place on Hold" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Reason / Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg disabled:opacity-50">
            {submitting ? 'Placing Hold…' : 'Place on Hold'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

// ---- Shared Modal Shell ----
function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ---- Main Component ----
export default function PinDetailPanel({
  pin,
  currentStock,
  transactions,
  issues,
  originDelivery,
  locations = [],
}: PinDetailPanelProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'issues' | 'genealogy'>('overview')
  const [modal, setModal] = useState<ActiveModal>(null)
  const [isPending, startTransition] = useTransition()

  function closeModal() { setModal(null) }
  function doneModal() { setModal(null); router.refresh() }

  function handleReleaseHold() {
    startTransition(async () => {
      const result = await releaseHold(pin.id)
      if (result.success) { toast.success('Hold released'); router.refresh() }
      else toast.error(result.error ?? 'Failed')
    })
  }

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'transactions', label: `Transactions (${transactions.length})` },
    { id: 'issues', label: `Issues (${issues.length})` },
    { id: 'genealogy', label: 'Genealogy' },
  ] as const

  return (
    <>
      {/* Modals */}
      {modal === 'adjust' && (
        <AdjustModal pin={pin} currentStock={currentStock} onClose={closeModal} onDone={doneModal} />
      )}
      {modal === 'transfer' && (
        <TransferModal pin={pin} currentStock={currentStock} locations={locations} onClose={closeModal} onDone={doneModal} />
      )}
      {modal === 'scrap' && (
        <ScrapModal pin={pin} currentStock={currentStock} onClose={closeModal} onDone={doneModal} />
      )}
      {modal === 'hold' && (
        <HoldModal pin={pin} onClose={closeModal} onDone={doneModal} />
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-6 flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Overview tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setModal('adjust')}
                  disabled={pin.status === 'scrapped'}
                  className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                >
                  Adjust Stock
                </button>
                <button
                  onClick={() => setModal('transfer')}
                  disabled={pin.status === 'scrapped' || currentStock === 0}
                  className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                >
                  Transfer Location
                </button>
                <button
                  onClick={() => setModal('scrap')}
                  disabled={pin.status === 'scrapped' || currentStock === 0}
                  className="px-3 py-1.5 text-sm font-medium border border-red-200 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-40"
                >
                  Write Off
                </button>
                {pin.status === 'approved' && (
                  <button
                    onClick={() => setModal('hold')}
                    className="px-3 py-1.5 text-sm font-medium border border-orange-200 text-orange-700 rounded-lg hover:bg-orange-50"
                  >
                    Place on Hold
                  </button>
                )}
                {pin.status === 'on_hold' && (
                  <button
                    onClick={handleReleaseHold}
                    disabled={isPending}
                    className="px-3 py-1.5 text-sm font-medium border border-green-200 text-green-700 rounded-lg hover:bg-green-50 disabled:opacity-50"
                  >
                    {isPending ? 'Releasing…' : 'Release Hold'}
                  </button>
                )}
              </div>

              {/* Info grid */}
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
                <InfoRow label="PIN Number" value={<span className="font-mono text-xs font-semibold">{pin.pin_number}</span>} />
                <InfoRow label="Status" value={<StatusBadge status={pin.status} />} />
                <InfoRow label="Part Number" value={pin.part_number} />
                <InfoRow label="Category" value={pin.category} />
                <InfoRow label="Unit" value={pin.unit} />
                <InfoRow
                  label="Location"
                  value={
                    pin.location
                      ? `${pin.location.code} — ${pin.location.name} (${pin.location.warehouse})`
                      : null
                  }
                />
                <InfoRow label="Origin Type" value={pin.origin_type} />
                <InfoRow label="Created" value={formatDate(pin.created_at)} />
                {originDelivery && (
                  <InfoRow
                    label="Origin Delivery"
                    value={
                      <span className="text-xs">
                        {(originDelivery.delivery as any)?.delivery_ref ?? '—'}
                        {(originDelivery.delivery as any)?.purchase_order?.po_number &&
                          ` / ${(originDelivery.delivery as any).purchase_order.po_number}`}
                      </span>
                    }
                  />
                )}
              </dl>
            </div>
          )}

          {/* Transactions tab */}
          {activeTab === 'transactions' && (
            <TransactionLog transactions={transactions} />
          )}

          {/* Issues tab */}
          {activeTab === 'issues' && (
            <div>
              {issues.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No issues for this PIN.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Issue #', 'Issued To', 'Qty', 'Status', 'Purpose', 'Date'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {issues.map((issue: any) => (
                      <tr key={issue.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link href={`/issues/${issue.id}`} className="font-mono text-xs text-blue-600 hover:underline">
                            {issue.issue_number}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm">{issue.issued_to?.full_name ?? '—'}</td>
                        <td className="px-4 py-3 tabular-nums">{issue.quantity}</td>
                        <td className="px-4 py-3"><StatusBadge status={issue.status} /></td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-40 truncate">{issue.purpose}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{formatDate(issue.issued_at ?? issue.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Genealogy tab */}
          {activeTab === 'genealogy' && (
            <div className="space-y-5">
              {pin.parent_pin && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Derived From</h4>
                  <div className="rounded-lg border border-gray-200 p-4 flex items-center gap-3">
                    <Link href={`/inventory/pins/${pin.parent_pin.id}`} className="font-mono text-xs text-blue-600 hover:underline">
                      {pin.parent_pin.pin_number}
                    </Link>
                    <span className="text-sm text-gray-600">{pin.parent_pin.description}</span>
                  </div>
                </div>
              )}

              {pin.derived_pins && pin.derived_pins.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Derived PINs ({pin.derived_pins.length})
                  </h4>
                  <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                    {pin.derived_pins.map((dp: any) => (
                      <div key={dp.id} className="px-4 py-3 flex items-center gap-3">
                        <Link href={`/inventory/pins/${dp.id}`} className="font-mono text-xs text-blue-600 hover:underline">
                          {dp.pin_number}
                        </Link>
                        <span className="text-sm text-gray-600 flex-1">{dp.description}</span>
                        <StatusBadge status={dp.status} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pin.recovery && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Linked Recovery</h4>
                  <div className="rounded-lg border border-gray-200 p-4 flex items-center gap-3">
                    <span className="font-mono text-xs text-gray-700">{pin.recovery.recovery_ref}</span>
                    <StatusBadge status={pin.recovery.status} size="sm" />
                    {pin.recovery.outcome && (
                      <span className="text-xs text-gray-500">{pin.recovery.outcome}</span>
                    )}
                  </div>
                </div>
              )}

              {!pin.parent_pin && (!pin.derived_pins || pin.derived_pins.length === 0) && !pin.recovery && (
                <p className="text-sm text-gray-400 text-center py-8">
                  No genealogy data — this PIN has no parent, derived, or recovery links.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
