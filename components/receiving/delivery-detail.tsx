'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { StatusBadge } from '@/components/shared/status-badge'
import { PageHeader } from '@/components/shared/page-header'
import { transitionDelivery } from '@/actions/deliveries'

type Tab = 'details' | 'items' | 'history'

interface StoreLocation {
  id: string
  code: string
  name: string
  warehouse?: string | null
  zone?: string | null
}

interface DeliveryDetailProps {
  delivery: {
    id: string
    delivery_ref: string
    status: string
    supplier_delivery_note?: string | null
    tracking_number?: string | null
    carrier?: string | null
    expected_date?: string | null
    actual_received_date?: string | null
    notes?: string | null
    created_at: string
    purchase_order?: {
      id: string
      po_number: string
      currency?: string | null
      vendor?: {
        id: string
        name: string
        email?: string | null
      } | null
      po_items?: Array<{
        id: string
        line_number: number
        description: string
        part_number?: string | null
        quantity: number
        unit: string
        unit_price: number
      }> | null
    } | null
    delivery_items?: Array<{
      id: string
      line_number: number
      description: string
      part_number?: string | null
      quantity_expected: number
      quantity_received?: number | null
      unit: string
      condition_notes?: string | null
      is_partial?: boolean
    }>
    received_by_profile?: { id: string; full_name?: string | null } | null
    location?: { id: string; code: string; name: string } | null
    qc_inspections?: Array<{
      id: string
      inspection_ref: string
      status: string
      result?: string | null
      inspection_date?: string | null
    }>
  }
  availableTransitions: Array<{
    event: string
    to: string
    label: string
  }>
  storeLocations: StoreLocation[]
  currentRole: string
}

const TRANSITION_STYLES: Record<string, string> = {
  dispatch: 'bg-blue-600 text-white hover:bg-blue-700',
  receive: 'bg-green-600 text-white hover:bg-green-700',
  send_to_qc: 'bg-teal-600 text-white hover:bg-teal-700',
  cancel: 'bg-gray-600 text-white hover:bg-gray-700',
  pass_inspection: 'bg-emerald-600 text-white hover:bg-emerald-700',
  fail_inspection: 'bg-red-600 text-white hover:bg-red-700',
  conditional_inspection: 'bg-amber-600 text-white hover:bg-amber-700',
  accept_into_inventory: 'bg-indigo-600 text-white hover:bg-indigo-700',
  delay: 'bg-orange-600 text-white hover:bg-orange-700',
  resume: 'bg-blue-600 text-white hover:bg-blue-700',
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function fmtDatetime(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value ?? <span className="text-gray-400">—</span>}</dd>
    </div>
  )
}

export default function DeliveryDetail({
  delivery,
  availableTransitions,
  storeLocations,
  currentRole,
}: DeliveryDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('details')
  const [isPending, startTransition] = useTransition()
  const [selectedLocation, setSelectedLocation] = useState('')
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const needsLocation = availableTransitions.some((t) => t.event === 'receive')

  const handleTransition = (t: { event: string; to: string }) => {
    if (t.event === 'receive' && !selectedLocation) {
      setActionMsg({ type: 'error', text: 'Please select a receiving location first.' })
      return
    }
    startTransition(async () => {
      const result = await transitionDelivery(
        delivery.id,
        t.to,
        t.event === 'receive' ? selectedLocation : undefined
      )
      if (!result.success) {
        setActionMsg({
          type: 'error',
          text: typeof result.error === 'string' ? result.error : 'Transition failed.',
        })
      } else {
        setActionMsg({ type: 'success', text: `Delivery ${t.event.replace(/_/g, ' ')} successfully.` })
      }
    })
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'details', label: 'Details' },
    { id: 'items', label: 'Items', count: (delivery.delivery_items ?? []).length },
    { id: 'history', label: 'QC & History' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={delivery.delivery_ref}
        description={`PO: ${delivery.purchase_order?.po_number ?? '—'} · Vendor: ${delivery.purchase_order?.vendor?.name ?? '—'}`}
      >
        <StatusBadge status={delivery.status} />
        <div className="flex items-center gap-2 flex-wrap">
          {availableTransitions.map((t) => {
            const style = TRANSITION_STYLES[t.event] ?? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            return (
              <button
                key={`${t.event}-${t.to}`}
                onClick={() => handleTransition(t)}
                disabled={isPending}
                className={`inline-flex items-center px-3.5 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${style}`}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </PageHeader>

      {/* Action feedback */}
      {actionMsg && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            actionMsg.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {actionMsg.text}
        </div>
      )}

      {/* QC cross-link banner */}
      {delivery.status === 'qc_pending' && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-teal-900">🔬 Ready for QC Inspection</p>
            <p className="text-xs text-teal-700 mt-0.5">
              This delivery has been received and is awaiting quality control inspection.
            </p>
          </div>
          <Link
            href={`/qc/inspections/${delivery.id}`}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition-colors shadow-sm"
          >
            Start QC Inspection →
          </Link>
        </div>
      )}

      {/* Location selector (shown when receive action is available) */}
      {needsLocation && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <label className="block text-sm font-medium text-amber-900 mb-2">
            Select Receiving Location (required to receive)
          </label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="block w-full max-w-sm rounded-md border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">— Select location —</option>
            {storeLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                [{loc.code}] {loc.name}
                {loc.warehouse ? ` · ${loc.warehouse}` : ''}
                {loc.zone ? ` · Zone ${loc.zone}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Details tab */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 rounded-xl border border-gray-200 bg-white p-6">
            <InfoItem label="Delivery Ref" value={
              <span className="font-mono">{delivery.delivery_ref}</span>
            } />
            <InfoItem label="Status" value={<StatusBadge status={delivery.status} />} />
            <InfoItem label="PO Number" value={
              delivery.purchase_order ? (
                <Link
                  href={`/procurement/purchase-orders/${delivery.purchase_order.id}`}
                  className="font-mono text-blue-600 hover:underline"
                >
                  {delivery.purchase_order.po_number}
                </Link>
              ) : null
            } />
            <InfoItem label="Vendor" value={
              delivery.purchase_order?.vendor?.name
            } />
            <InfoItem label="Supplier Delivery Note" value={delivery.supplier_delivery_note} />
            <InfoItem label="Tracking Number" value={
              delivery.tracking_number ? (
                <span className="font-mono">{delivery.tracking_number}</span>
              ) : null
            } />
            <InfoItem label="Carrier" value={delivery.carrier} />
            <InfoItem label="Expected Date" value={fmtDate(delivery.expected_date)} />
            <InfoItem label="Received Date" value={
              delivery.actual_received_date ? (
                <span className="text-green-700 font-medium">{fmtDate(delivery.actual_received_date)}</span>
              ) : null
            } />
            <InfoItem label="Received By" value={delivery.received_by_profile?.full_name} />
            <InfoItem label="Receiving Location" value={
              delivery.location ? (
                <span>[{delivery.location.code}] {delivery.location.name}</span>
              ) : null
            } />
            <InfoItem label="Created" value={fmtDatetime(delivery.created_at)} />
          </div>

          {delivery.notes && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">{delivery.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Items tab */}
      {activeTab === 'items' && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {!(delivery.delivery_items ?? []).length ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">
              No delivery items recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part No.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expected</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Received</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partial?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(delivery.delivery_items ?? []).map((item) => {
                    const isPartial = (item.quantity_received ?? 0) < item.quantity_expected
                    const isShort = item.is_partial || isPartial
                    return (
                      <tr key={item.id} className={`hover:bg-gray-50 ${isShort ? 'bg-amber-50/30' : ''}`}>
                        <td className="px-4 py-3 text-gray-500">{item.line_number}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{item.description}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{item.part_number ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{item.quantity_expected}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          <span className={isShort ? 'text-amber-600' : 'text-green-700'}>
                            {item.quantity_received ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{item.unit}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {item.condition_notes ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          {isShort && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              Partial
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* QC Inspections */}
          {(delivery.qc_inspections ?? []).length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-900">QC Inspections</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inspection Ref</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(delivery.qc_inspections ?? []).map((insp) => (
                    <tr key={insp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/qc/inspections/${insp.id}`}
                          className="font-mono text-blue-600 hover:underline text-sm"
                        >
                          {insp.inspection_ref}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={insp.status} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        {insp.result ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            insp.result === 'pass' ? 'bg-green-100 text-green-700' :
                            insp.result === 'fail' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {insp.result.charAt(0).toUpperCase() + insp.result.slice(1)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{fmtDate(insp.inspection_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(delivery.qc_inspections ?? []).length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-400">
              No QC inspections recorded for this delivery.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
