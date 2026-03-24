'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, Printer, Pencil, CheckCircle2, Circle, ChevronRight } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { PageHeader } from '@/components/shared/page-header'
import { transitionPurchaseOrder } from '@/actions/purchase-orders'
import { approvePurchaseOrder, declinePurchaseOrder, placeOrder } from '@/actions/purchase-flow'
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
  currentUserId?: string
}

// ─── Pipeline stages ─────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { key: 'pending_approval', label: 'Pending Approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'ordered', label: 'Ordered' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'completed', label: 'Completed' },
] as const

function stageIndex(status: string): number {
  const map: Record<string, number> = {
    pending_approval: 0,
    approved: 1,
    ordered: 2,
    partially_delivered: 3,
    delivered: 3,
    qc_passed: 4,
    closed: 4,
    completed: 4,
  }
  return map[status] ?? -1
}

function StatusPipeline({ currentStatus }: { currentStatus: string }) {
  const current = stageIndex(currentStatus)
  if (current < 0) return null

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-6 py-4">
      <div className="flex items-center gap-1 overflow-x-auto">
        {PIPELINE_STAGES.map((stage, idx) => {
          const done = idx < current
          const active = idx === current
          return (
            <div key={stage.key} className="flex items-center gap-1 shrink-0">
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-blue-600 text-white'
                    : done
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Circle className="h-3.5 w-3.5" />
                )}
                {stage.label}
              </div>
              {idx < PIPELINE_STAGES.length - 1 && (
                <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Action Panels ────────────────────────────────────────────────────────────

function ApprovalPanel({
  poId,
  onSuccess,
  onError,
}: {
  poId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [approveComment, setApproveComment] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [mode, setMode] = useState<'idle' | 'approve' | 'reject'>('idle')

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approvePurchaseOrder(poId, approveComment || undefined)
      if (result.success) {
        onSuccess('PO approved successfully.')
        router.refresh()
      } else {
        onError(typeof result.error === 'string' ? result.error : 'Failed to approve PO.')
      }
    })
  }

  const handleReject = () => {
    if (!rejectReason.trim()) {
      onError('A rejection reason is required.')
      return
    }
    startTransition(async () => {
      const result = await declinePurchaseOrder(poId, rejectReason)
      if (result.success) {
        onSuccess('PO rejected.')
        router.refresh()
      } else {
        onError(typeof result.error === 'string' ? result.error : 'Failed to reject PO.')
      }
    })
  }

  if (mode === 'approve') {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-green-900">Approve Purchase Order</h3>
        <textarea
          value={approveComment}
          onChange={(e) => setApproveComment(e.target.value)}
          rows={2}
          placeholder="Optional comment…"
          className="block w-full rounded-md border border-green-300 bg-white px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Approving…' : 'Confirm Approve'}
          </button>
          <button
            onClick={() => setMode('idle')}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'reject') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-red-900">Reject Purchase Order</h3>
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={2}
          placeholder="Rejection reason (required)…"
          className="block w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        <div className="flex gap-3">
          <button
            onClick={handleReject}
            disabled={isPending}
            className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Rejecting…' : 'Confirm Reject'}
          </button>
          <button
            onClick={() => setMode('idle')}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <p className="text-sm font-semibold text-amber-900">Awaiting Your Approval</p>
        <p className="text-xs text-amber-700 mt-0.5">
          Review the line items and approve or reject this purchase order.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode('approve')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
        >
          Approve PO
        </button>
        <button
          onClick={() => setMode('reject')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
        >
          Reject PO
        </button>
      </div>
    </div>
  )
}

function PlaceOrderPanel({
  poId,
  onSuccess,
  onError,
}: {
  poId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deliveryDate, setDeliveryDate] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [expanded, setExpanded] = useState(false)

  const handlePlaceOrder = () => {
    startTransition(async () => {
      const result = await placeOrder(poId, deliveryDate || undefined, orderNotes || undefined)
      if (result.success) {
        onSuccess('Order placed successfully. Delivery record created.')
        router.refresh()
      } else {
        onError(typeof result.error === 'string' ? result.error : 'Failed to place order.')
      }
    })
  }

  if (!expanded) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-blue-900">Ready to Place Order</p>
          <p className="text-xs text-blue-700 mt-0.5">
            This PO has been approved. Place the order with the vendor and a delivery will be created automatically.
          </p>
        </div>
        <button
          onClick={() => setExpanded(true)}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          Place Order
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-blue-900">Place Order</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Expected Delivery Date <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Notes <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="e.g. Urgent, contact vendor"
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={handlePlaceOrder}
          disabled={isPending}
          className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Placing Order…' : 'Confirm Place Order'}
        </button>
        <button
          onClick={() => setExpanded(false)}
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PoDetail({ po, availableTransitions, currentRole, currentUserId }: PoDetailProps) {
  const router = useRouter()
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

  const handleCancelTransition = (t: { event: string; to: string }) => {
    setPendingTransition(t)
    setShowCommentModal(true)
  }

  const executeCancelTransition = (toStatus: string, eventLabel: string, commentText?: string) => {
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
        router.refresh()
      }
      setShowCommentModal(false)
      setPendingTransition(null)
      setComment('')
    })
  }

  // Cancel transitions (only show cancel/revise)
  const cancelTransitions = availableTransitions.filter((t) =>
    ['cancel', 'revise', 'close'].includes(t.event)
  )

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'details', label: 'Details' },
    { id: 'deliveries', label: 'Deliveries', count: (po.deliveries ?? []).length },
    { id: 'payments', label: 'Payments', count: (po.payments ?? []).length },
    { id: 'history', label: 'Workflow History' },
  ]

  const showOrderedTimeline = ['ordered', 'partially_delivered', 'delivered', 'qc_passed', 'closed', 'completed'].includes(po.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={po.po_number}
        description={`Vendor: ${po.vendors?.name ?? '—'}`}
      >
        <StatusBadge status={po.status} />
        <div className="flex items-center gap-2 flex-wrap">
          {/* Edit PO — only for draft / rejected */}
          {['draft', 'rejected'].includes(po.status) && (
            <Link
              href={`/procurement/purchase-orders/${po.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-md border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Edit PO
            </Link>
          )}

          {/* Print PO */}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print PO
          </button>

          {/* Cancel/revise generic transitions */}
          {cancelTransitions.map((t) => (
            <button
              key={`${t.event}-${t.to}`}
              onClick={() => handleCancelTransition(t)}
              disabled={isPending}
              className="inline-flex items-center px-3.5 py-2 text-sm font-medium rounded-md bg-gray-600 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {t.label}
            </button>
          ))}
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
          <button
            onClick={() => setActionMsg(null)}
            className="ml-3 text-xs underline opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Status pipeline — shown for ordered and beyond */}
      {showOrderedTimeline && <StatusPipeline currentStatus={po.status} />}

      {/* Rejection reason */}
      {po.rejection_reason && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span className="font-medium">Rejection reason:</span> {po.rejection_reason}
        </div>
      )}

      {/* ── Flow-specific action panels ── */}

      {/* pending_approval → Approver can approve/reject */}
      {po.status === 'pending_approval' && (
        <ApprovalPanel
          poId={po.id}
          onSuccess={(msg) => setActionMsg({ type: 'success', text: msg })}
          onError={(msg) => setActionMsg({ type: 'error', text: msg })}
        />
      )}

      {/* approved → PM can place order */}
      {po.status === 'approved' && (
        <PlaceOrderPanel
          poId={po.id}
          onSuccess={(msg) => setActionMsg({ type: 'success', text: msg })}
          onError={(msg) => setActionMsg({ type: 'error', text: msg })}
        />
      )}

      {/* ordered → Show delivery link */}
      {po.status === 'ordered' && (po.deliveries ?? []).length > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-green-900">Order Placed — Delivery Pending</p>
            <p className="text-xs text-green-700 mt-0.5">
              {(po.deliveries ?? []).length} delivery record(s) created. Track receiving below.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('deliveries')}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors shadow-sm"
          >
            <Package className="h-4 w-4" />
            View Deliveries
          </button>
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
        <div className="space-y-4">
          {/* Create Delivery button when PO is ordered or partially delivered */}
          {['ordered', 'partially_delivered'].includes(po.status) && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-green-900">Ready to Receive</p>
                <p className="text-xs text-green-700 mt-0.5">
                  Record a new delivery when goods arrive from{' '}
                  <strong>{po.vendors?.name ?? 'vendor'}</strong>.
                </p>
              </div>
              <Link
                href={`/procurement/deliveries/new?po_id=${po.id}`}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors shadow-sm"
              >
                <Package className="h-4 w-4" />
                Record Delivery
              </Link>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {!(po.deliveries ?? []).length ? (
              <div className="px-6 py-12 text-center text-sm text-gray-400">
                No deliveries recorded for this PO.{' '}
                {['ordered', 'partially_delivered'].includes(po.status) && (
                  <Link href={`/procurement/deliveries/new?po_id=${po.id}`} className="text-blue-600 hover:underline">
                    Record first delivery →
                  </Link>
                )}
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
                          href={`/procurement/deliveries/${d.id}`}
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
                    onSuccess={() => {
                      setShowPaymentForm(false)
                      router.refresh()
                    }}
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

      {/* Comment modal for cancel/revise */}
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
                onClick={() => executeCancelTransition(pendingTransition.to, pendingTransition.event, comment || undefined)}
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
