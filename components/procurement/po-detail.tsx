'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { StatusBadge } from '@/components/shared/status-badge'
import { PageHeader } from '@/components/shared/page-header'
import { transitionPurchaseOrder } from '@/actions/purchase-orders'
import PaymentForm from '@/components/procurement/payment-form'

type Tab = 'details' | 'deliveries' | 'payments' | 'history'

interface PoDetailProps {
  po: {
    id: string
    po_number: string
    status: string
    currency: string
    total_amount?: number | null
    tax_amount?: number | null
    discount_amount?: number | null
    payment_terms?: string | null
    delivery_address?: string | null
    incoterms?: string | null
    expected_delivery?: string | null
    actual_delivery?: string | null
    rejection_reason?: string | null
    notes?: string | null
    approved_at?: string | null
    ordered_at?: string | null
    created_at: string
    vendors?: {
      id: string
      code: string
      name: string
      email?: string | null
      phone?: string | null
    } | null
    requirements?: {
      id: string
      ref_number: string
      title: string
    } | null
    po_items?: Array<{
      id: string
      line_number: number
      description: string
      part_number?: string | null
      quantity: number
      unit: string
      unit_price: number
      currency: string
      tax_rate?: number | null
      discount_rate?: number | null
      line_total?: number | null
    }>
    payments?: Array<{
      id: string
      payment_ref?: string | null
      amount: number
      currency: string
      payment_method?: string | null
      status: string
      payment_date?: string | null
      bank_reference?: string | null
    }>
    deliveries?: Array<{
      id: string
      delivery_ref: string
      status: string
      expected_date?: string | null
      actual_received_date?: string | null
    }>
    workflow_history?: Array<{
      id: string
      event: string
      from_status?: string | null
      to_status: string
      actor?: { full_name?: string | null } | null
      comment?: string | null
      created_at: string
    }>
  }
  availableTransitions: Array<{
    event: string
    to: string
    label: string
    requiresComment?: boolean
  }>
  currentRole: string
}

const TRANSITION_LABELS: Record<string, { label: string; style: string }> = {
  submit: { label: 'Submit for Approval', style: 'bg-blue-600 text-white hover:bg-blue-700' },
  approve: { label: 'Approve', style: 'bg-green-600 text-white hover:bg-green-700' },
  reject: { label: 'Reject', style: 'bg-red-600 text-white hover:bg-red-700' },
  place_order: { label: 'Place Order', style: 'bg-indigo-600 text-white hover:bg-indigo-700' },
  cancel: { label: 'Cancel PO', style: 'bg-gray-600 text-white hover:bg-gray-700' },
  close: { label: 'Close PO', style: 'bg-slate-600 text-white hover:bg-slate-700' },
}

const REQUIRES_COMMENT = ['reject', 'cancel']

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

function fmtCurrency(amount: number | null | undefined, currency: string) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
  )
}

export default function PoDetail({ po, availableTransitions, currentRole }: PoDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('details')
  const [isPending, startTransition] = useTransition()
  const [comment, setComment] = useState('')
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [pendingTransition, setPendingTransition] = useState<{ event: string; to: string } | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const paidTotal = (po.payments ?? [])
    .filter((p) => ['approved', 'completed'].includes(p.status))
    .reduce((s, p) => s + p.amount, 0)

  const remainingAmount = Math.max(0, (po.total_amount ?? 0) - paidTotal)

  const handleTransition = (t: { event: string; to: string }) => {
    if (REQUIRES_COMMENT.includes(t.event)) {
      setPendingTransition(t)
      setShowCommentModal(true)
    } else {
      executeTransition(t.to, t.event, undefined)
    }
  }

  const executeTransition = (toStatus: string, eventLabel: string, commentText?: string) => {
    startTransition(async () => {
      const result = await transitionPurchaseOrder(po.id, toStatus, commentText)
      if (!result.success) {
        setActionMsg({
          type: 'error',
          text: typeof result.error === 'string'
            ? result.error
            : Object.values(result.error as Record<string, string[]>).flat().join(', '),
        })
      } else {
        setActionMsg({ type: 'success', text: `PO ${eventLabel.replace(/_/g, ' ')} successfully.` })
      }
      setShowCommentModal(false)
      setPendingTransition(null)
      setComment('')
    })
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'details', label: 'Details' },
    { id: 'deliveries', label: 'Deliveries', count: (po.deliveries ?? []).length },
    { id: 'payments', label: 'Payments', count: (po.payments ?? []).length },
    { id: 'history', label: 'Workflow History' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={po.po_number}
        description={`Vendor: ${po.vendors?.name ?? '—'}`}
      >
        <StatusBadge status={po.status} />
        <div className="flex items-center gap-2 flex-wrap">
          {availableTransitions.map((t) => {
            const style = TRANSITION_LABELS[t.event]?.style ?? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            return (
              <button
                key={t.event}
                onClick={() => handleTransition(t)}
                disabled={isPending}
                className={`inline-flex items-center px-3.5 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${style}`}
              >
                {TRANSITION_LABELS[t.event]?.label ?? t.label}
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

      {po.rejection_reason && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span className="font-medium">Rejection reason:</span> {po.rejection_reason}
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
          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 rounded-xl border border-gray-200 bg-white p-6">
            <InfoItem label="Vendor" value={
              po.vendors ? (
                <Link href={`/vendors/${po.vendors.id}`} className="text-blue-600 hover:underline">
                  [{po.vendors.code}] {po.vendors.name}
                </Link>
              ) : '—'
            } />
            <InfoItem label="Requirement" value={
              po.requirements ? (
                <span className="font-mono text-sm">{po.requirements.ref_number}</span>
              ) : '—'
            } />
            <InfoItem label="Status" value={<StatusBadge status={po.status} />} />
            <InfoItem label="Payment Terms" value={po.payment_terms} />
            <InfoItem label="Incoterms" value={po.incoterms} />
            <InfoItem label="Currency" value={po.currency} />
            <InfoItem label="Expected Delivery" value={fmtDate(po.expected_delivery)} />
            <InfoItem label="Actual Delivery" value={fmtDate(po.actual_delivery)} />
            <InfoItem label="Approved At" value={fmtDatetime(po.approved_at)} />
            <InfoItem label="Ordered At" value={fmtDatetime(po.ordered_at)} />
            <InfoItem label="Created At" value={fmtDatetime(po.created_at)} />
          </div>

          {po.delivery_address && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Delivery Address</dt>
              <dd className="text-sm text-gray-900 whitespace-pre-line">{po.delivery_address}</dd>
            </div>
          )}

          {/* Line Items */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Line Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part No.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tax%</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Disc%</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(po.po_items ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">
                        No line items.
                      </td>
                    </tr>
                  ) : (
                    (po.po_items ?? []).map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500">{item.line_number}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{item.description}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{item.part_number ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{item.quantity}</td>
                        <td className="px-4 py-3 text-gray-600">{item.unit}</td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {fmtCurrency(item.unit_price, item.currency)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{item.tax_rate ?? 0}%</td>
                        <td className="px-4 py-3 text-right text-gray-600">{item.discount_rate ?? 0}%</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {fmtCurrency(item.line_total, po.currency)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                  <tr>
                    <td colSpan={8} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      Total
                    </td>
                    <td className="px-4 py-3 text-right text-base font-bold text-gray-900">
                      {fmtCurrency(po.total_amount, po.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {po.notes && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">{po.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Deliveries tab */}
      {activeTab === 'deliveries' && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {!(po.deliveries ?? []).length ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">
              No deliveries recorded for this PO.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery Ref</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(po.deliveries ?? []).map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/receiving/${d.id}`}
                        className="font-mono text-blue-600 hover:underline text-sm"
                      >
                        {d.delivery_ref}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(d.expected_date)}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(d.actual_received_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Payments tab */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">PO Total</div>
              <div className="mt-1 text-xl font-bold text-gray-900">
                {fmtCurrency(po.total_amount, po.currency)}
              </div>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="text-xs font-medium text-green-700 uppercase tracking-wide">Paid</div>
              <div className="mt-1 text-xl font-bold text-green-700">
                {fmtCurrency(paidTotal, po.currency)}
              </div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-xs font-medium text-amber-700 uppercase tracking-wide">Remaining</div>
              <div className="mt-1 text-xl font-bold text-amber-700">
                {fmtCurrency(remainingAmount, po.currency)}
              </div>
            </div>
          </div>

          {/* Add Payment */}
          {['approved', 'ordered', 'partially_delivered', 'delivered', 'closed'].includes(po.status) && (
            <div>
              {showPaymentForm ? (
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Record Payment</h3>
                  <PaymentForm
                    poId={po.id}
                    poNumber={po.po_number}
                    remainingAmount={remainingAmount}
                    onSuccess={() => setShowPaymentForm(false)}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setShowPaymentForm(true)}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  + Record Payment
                </button>
              )}
            </div>
          )}

          {/* Payments table */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {!(po.payments ?? []).length ? (
              <div className="px-6 py-12 text-center text-sm text-gray-400">No payments recorded.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Ref</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bank Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(po.payments ?? []).map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm text-gray-800">{p.payment_ref ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {fmtCurrency(p.amount, p.currency)}
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-600">
                        {p.payment_method?.replace(/_/g, ' ') ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-gray-600">{fmtDate(p.payment_date)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.bank_reference ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          {!(po.workflow_history ?? []).length ? (
            <div className="text-center text-sm text-gray-400 py-8">No workflow history yet.</div>
          ) : (
            <ol className="relative border-l border-gray-200 space-y-6">
              {(po.workflow_history ?? []).map((entry, idx) => (
                <li key={entry.id ?? idx} className="ml-6">
                  <span className="absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 ring-4 ring-white">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900 capitalize">
                        {entry.event.replace(/_/g, ' ')}
                      </span>
                      {entry.from_status && (
                        <span className="text-xs text-gray-500">
                          {entry.from_status} → {entry.to_status}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{fmtDatetime(entry.created_at)}</span>
                      {entry.actor?.full_name && (
                        <span>· {entry.actor.full_name}</span>
                      )}
                    </div>
                    {entry.comment && (
                      <p className="mt-1 text-sm text-gray-600 bg-gray-50 rounded px-3 py-2 border border-gray-100">
                        {entry.comment}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* Comment modal */}
      {showCommentModal && pendingTransition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1 capitalize">
              {pendingTransition.event.replace(/_/g, ' ')} PO
            </h3>
            <p className="text-sm text-gray-500 mb-4">Please provide a reason or comment.</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Comment / reason…"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowCommentModal(false)
                  setPendingTransition(null)
                  setComment('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                onClick={() => executeTransition(pendingTransition.to, pendingTransition.event, comment || undefined)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={isPending}
              >
                {isPending ? 'Processing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
