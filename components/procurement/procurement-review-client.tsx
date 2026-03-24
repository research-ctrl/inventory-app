'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow, format } from 'date-fns'
import {
  Package, ShoppingCart, HelpCircle, ChevronDown,
  CheckCircle2, XCircle, ClipboardList, AlertTriangle,
  Clock, MapPin, User, Calendar, Truck, UserCheck,
  ArrowRight, Send,
} from 'lucide-react'
import {
  releaseFromInventoryNow,
  requestApprovalForRelease,
  approveRelease,
  declineRequirement,
} from '@/actions/part1-procurement'
import { approvePurchaseRequirement } from '@/actions/purchase-flow'

// ─── Types ────────────────────────────────────────────────────────────────────

interface InventoryPin {
  id: string
  pin_number: string
  description: string
  part_number: string | null
  unit: string | null
  location: { id: string; code: string; name: string; warehouse: string } | null
}

interface RequirementItem {
  id: string
  line_number: number
  description: string
  part_number: string | null
  quantity: number
  unit: string
  estimated_unit_price: number | null
  currency: string
  notes: string | null
  inventory_pin_id: string | null
  item_request_type: string | null
  inventory_pin: InventoryPin | null
}

interface Approver {
  id: string
  full_name: string | null
  email: string
  role: string
}

interface Requirement {
  id: string
  ref_number: string
  title: string
  description: string | null
  status: string
  urgency: string
  required_date: string | null
  created_at: string
  request_type: string | null
  requested_on_behalf_of: string | null
  preferred_vendor_free_text: string | null
  assigned_approver_id?: string | null
  requested_by_profile: { id: string; full_name: string | null; email: string } | null
  assigned_approver?: { id: string; full_name: string | null; email: string } | null
  vessel: { id: string; name: string } | null
  preferred_vendor: { id: string; name: string } | null
  requirement_items: RequirementItem[]
}

interface Props {
  submittedRequirements: Requirement[]
  pendingApprovalRequirements: Requirement[]
  approvers: Approver[]
  userRole: string
  currentUserId: string
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

const REQUEST_TYPE_META: Record<string, {
  label: string; icon: any; bg: string; text: string; border: string
}> = {
  to_release_from_inventory: {
    label: 'Release from Stock',
    icon: Package,
    bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200',
  },
  to_order: {
    label: 'Purchase',
    icon: ShoppingCart,
    bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200',
  },
  to_enquire_price: {
    label: 'Enquire Price',
    icon: HelpCircle,
    bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200',
  },
}

function RequestTypeBadge({ type }: { type: string | null }) {
  const meta = type ? REQUEST_TYPE_META[type] : null
  if (!meta) return null
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.bg} ${meta.text} ${meta.border}`}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  )
}

const URGENCY_META: Record<string, { label: string; dot: string; text: string }> = {
  critical: { label: 'Critical', dot: 'bg-red-500',    text: 'text-red-700' },
  urgent:   { label: 'Urgent',   dot: 'bg-orange-500', text: 'text-orange-700' },
  routine:  { label: 'Routine',  dot: 'bg-gray-400',   text: 'text-gray-500' },
}

// ─── Item line ────────────────────────────────────────────────────────────────

function ItemLine({ item, isRelease }: { item: RequirementItem; isRelease: boolean }) {
  const linked = isRelease && item.inventory_pin

  return (
    <div className={`flex items-start gap-3 rounded-lg px-3 py-2.5 border ${
      linked ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'
    }`}>
      <span className="text-xs font-mono font-bold text-gray-400 mt-0.5 w-4 flex-shrink-0">
        {item.line_number}
      </span>

      <div className="flex-1 min-w-0">
        {linked ? (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-green-800 bg-green-100 px-1.5 py-0.5 rounded border border-green-200">
                {item.inventory_pin!.pin_number}
              </span>
              {item.inventory_pin!.part_number && (
                <span className="text-xs text-gray-500">Part #{item.inventory_pin!.part_number}</span>
              )}
            </div>
            <div className="text-sm font-medium text-gray-900 mt-0.5">{item.description}</div>
            <div className="flex flex-wrap gap-3 text-xs text-green-700 mt-1">
              <span>Qty: <strong>{item.quantity} {item.unit}</strong></span>
              {item.inventory_pin!.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {item.inventory_pin!.location.code}
                  <span className="text-gray-400 ml-0.5">({item.inventory_pin!.location.warehouse})</span>
                </span>
              )}
            </div>
          </>
        ) : isRelease && !item.inventory_pin ? (
          <>
            <div className="text-sm text-gray-800">{item.description}</div>
            <div className="text-xs text-amber-600 font-medium mt-0.5">
              ⚠ No inventory PIN linked — cannot auto-issue this item
            </div>
          </>
        ) : (
          <>
            <div className="text-sm font-medium text-gray-900">{item.description}</div>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-0.5">
              <span><strong>{item.quantity} {item.unit}</strong></span>
              {item.part_number && <span>Part #{item.part_number}</span>}
              {item.estimated_unit_price && (
                <span>{item.currency} {item.estimated_unit_price.toLocaleString()}/unit</span>
              )}
            </div>
          </>
        )}
        {item.notes && (
          <div className="text-xs text-gray-400 italic mt-0.5">{item.notes}</div>
        )}
      </div>
    </div>
  )
}

// ─── Action panels ─────────────────────────────────────────────────────────────

type ActionMode =
  | null
  | 'release_now'
  | 'request_approval'
  | 'approve_release'
  | 'approve_purchase'
  | 'decline'

function InventoryReleaseActions({
  req,
  approvers,
  isPending,       // true = already in pending_approval state
  onDone,
}: {
  req: Requirement
  approvers: Approver[]
  isPending: boolean
  onDone: () => void
}) {
  const router = useRouter()
  const [mode, setMode] = useState<ActionMode>(null)
  const [comment, setComment] = useState('')
  const [reason, setReason] = useState('')
  const [approverId, setApproverId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handle(fn: () => Promise<{ success: boolean; error?: string }>) {
    setLoading(true)
    setError(null)
    const result = await fn()
    setLoading(false)
    if (!result.success) {
      setError(result.error ?? 'Something went wrong')
      return false
    }
    onDone()
    router.refresh()
    return true
  }

  const pinCount = (req.requirement_items ?? []).filter(i => i.inventory_pin_id).length
  const totalCount = (req.requirement_items ?? []).length

  if (!mode) {
    return (
      <div className="pt-3 border-t border-gray-100 space-y-2">
        {!isPending && (
          <p className="text-xs text-gray-500 pb-1">
            <strong>{pinCount}/{totalCount}</strong> item{totalCount !== 1 ? 's' : ''} linked to inventory PINs
          </p>
        )}
        {isPending && req.assigned_approver && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Awaiting approval from <strong className="ml-0.5">{req.assigned_approver.full_name ?? req.assigned_approver.email}</strong>
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {isPending ? (
            // Approver view
            <button
              onClick={() => setMode('approve_release')}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve & Release
            </button>
          ) : (
            <>
              <button
                onClick={() => setMode('release_now')}
                disabled={pinCount === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
                title={pinCount === 0 ? 'Link inventory PINs to items first' : undefined}
              >
                <Package className="h-4 w-4" />
                Release Now
              </button>
              <button
                onClick={() => setMode('request_approval')}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                <Send className="h-4 w-4" />
                Request Approval
              </button>
            </>
          )}

          <button
            onClick={() => setMode('decline')}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <XCircle className="h-4 w-4" />
            Decline
          </button>

          <Link
            href={`/requirements/${req.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            View Full
          </Link>
        </div>
      </div>
    )
  }

  // ── Release Now confirmation ──
  if (mode === 'release_now') {
    return (
      <div className="pt-3 border-t border-gray-100">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
          <div className="text-sm font-semibold text-green-900 flex items-center gap-2">
            <Package className="h-4 w-4" />
            Release {pinCount} item{pinCount !== 1 ? 's' : ''} from inventory
          </div>
          <p className="text-xs text-green-800">
            Material issues will be created and stock deducted immediately. No further approval needed.
          </p>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{error}</p>}
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
            placeholder="Optional note…"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => handle(() => releaseFromInventoryNow(req.id, comment || undefined))}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {loading
                ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <CheckCircle2 className="h-4 w-4" />}
              Confirm Release
            </button>
            <button onClick={() => { setMode(null); setError(null) }} disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60">
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Request Approval ──
  if (mode === 'request_approval') {
    return (
      <div className="pt-3 border-t border-gray-100">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
          <div className="text-sm font-semibold text-blue-900 flex items-center gap-2">
            <Send className="h-4 w-4" />
            Send for approval
          </div>
          <p className="text-xs text-blue-800">
            This requirement will be assigned to an approver. Stock will be released once they approve.
          </p>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{error}</p>}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">Assign to approver <span className="text-red-500">*</span></label>
            <select
              value={approverId}
              onChange={e => setApproverId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">— Select approver —</option>
              {approvers.map(a => (
                <option key={a.id} value={a.id}>
                  {a.full_name ?? a.email} ({a.role})
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
            placeholder="Note for the approver (optional)…"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!approverId) { setError('Please select an approver'); return }
                handle(() => requestApprovalForRelease(req.id, approverId, comment || undefined))
              }}
              disabled={loading || !approverId}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading
                ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <ArrowRight className="h-4 w-4" />}
              Send for Approval
            </button>
            <button onClick={() => { setMode(null); setError(null) }} disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Approve Release (pending_approval state) ──
  if (mode === 'approve_release') {
    return (
      <div className="pt-3 border-t border-gray-100">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
          <div className="text-sm font-semibold text-green-900 flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Approve & release {pinCount} item{pinCount !== 1 ? 's' : ''}
          </div>
          <p className="text-xs text-green-800">
            Stock will be deducted and material issues created immediately upon approval.
          </p>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{error}</p>}
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
            placeholder="Optional note…"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => handle(() => approveRelease(req.id, comment || undefined))}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {loading
                ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <CheckCircle2 className="h-4 w-4" />}
              Approve & Release
            </button>
            <button onClick={() => { setMode(null); setError(null) }} disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Decline ──
  if (mode === 'decline') {
    return (
      <div className="pt-3 border-t border-gray-100">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
          <div className="text-sm font-semibold text-red-900 flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Decline this request
          </div>
          <p className="text-xs text-red-700">The requester will be able to revise and resubmit.</p>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={2}
            placeholder="Reason for declining (required)…"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!reason.trim()) { setError('Please provide a reason'); return }
                handle(() => declineRequirement(req.id, reason))
              }}
              disabled={loading || !reason.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {loading
                ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <XCircle className="h-4 w-4" />}
              Confirm Decline
            </button>
            <button onClick={() => { setMode(null); setError(null) }} disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

function PurchaseActions({
  req,
  approvers,
  onDone,
}: {
  req: Requirement
  approvers: Approver[]
  onDone: () => void
}) {
  const router = useRouter()
  const [mode, setMode] = useState<ActionMode>(null)
  const [comment, setComment] = useState('')
  const [reason, setReason] = useState('')
  const [approverId, setApproverId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handle(fn: () => Promise<{ success: boolean; error?: string }>) {
    setLoading(true)
    setError(null)
    const result = await fn()
    setLoading(false)
    if (!result.success) {
      setError(result.error ?? 'Something went wrong')
      return
    }
    onDone()
    router.refresh()
  }

  if (!mode) {
    return (
      <div className="pt-3 border-t border-gray-100">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMode('approve_purchase')}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <CheckCircle2 className="h-4 w-4" />
            {req.request_type === 'to_order' ? 'Approve & Create PO' : 'Approve'}
          </button>
          <button
            onClick={() => setMode('decline')}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </button>
          <Link
            href={`/requirements/${req.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            View Full
          </Link>
        </div>
      </div>
    )
  }

  if (mode === 'approve_purchase') {
    const isPurchase = req.request_type === 'to_order'
    return (
      <div className="pt-3 border-t border-gray-100">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
          <div className="text-sm font-semibold text-blue-900 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {isPurchase ? 'Approve & create Purchase Order' : 'Approve this requirement'}
          </div>
          {isPurchase && (
            <p className="text-xs text-blue-800">
              A PO will be created automatically from the request items and sent to the selected approver for sign-off.
            </p>
          )}
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{error}</p>}

          {isPurchase && (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">
                Send PO for approval to <span className="text-red-500">*</span>
              </label>
              <select
                value={approverId}
                onChange={e => setApproverId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">— Select approver —</option>
                {approvers.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.full_name ?? a.email} ({a.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
            placeholder="Optional note…"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (isPurchase && !approverId) { setError('Please select an approver for the PO'); return }
                if (isPurchase) {
                  handle(() => approvePurchaseRequirement(req.id, approverId, comment || undefined))
                } else {
                  handle(() => approvePurchaseRequirement(req.id, approverId || (approvers[0]?.id ?? ''), comment || undefined))
                }
              }}
              disabled={loading || (isPurchase && !approverId)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading
                ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <CheckCircle2 className="h-4 w-4" />}
              {isPurchase ? 'Approve & Create PO' : 'Confirm Approval'}
            </button>
            <button onClick={() => { setMode(null); setError(null) }} disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'decline') {
    return (
      <div className="pt-3 border-t border-gray-100">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
          <div className="text-sm font-semibold text-red-900 flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Reject this request
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={2}
            placeholder="Reason for rejection (required)…"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!reason.trim()) { setError('Please provide a reason'); return }
                handle(() => declineRequirement(req.id, reason))
              }}
              disabled={loading || !reason.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {loading
                ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <XCircle className="h-4 w-4" />}
              Confirm Rejection
            </button>
            <button onClick={() => { setMode(null); setError(null) }} disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

// ─── Requirement Card ─────────────────────────────────────────────────────────

function RequirementCard({
  req,
  approvers,
  isPending,
}: {
  req: Requirement
  approvers: Approver[]
  isPending: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [done, setDone] = useState(false)

  if (done) return null

  const items = req.requirement_items ?? []
  const isRelease = req.request_type === 'to_release_from_inventory'
  const requesterName = req.requested_by_profile?.full_name ?? req.requested_by_profile?.email ?? '—'
  const urgencyMeta = URGENCY_META[req.urgency] ?? URGENCY_META.routine

  return (
    <div className={`rounded-xl border-2 bg-white overflow-hidden ${
      req.urgency === 'critical' ? 'border-red-200' :
      isPending ? 'border-blue-200' :
      req.urgency === 'urgent' ? 'border-orange-200' :
      'border-gray-200'
    }`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-gray-800">{req.ref_number}</span>
              <RequestTypeBadge type={req.request_type} />
              {isPending && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                  <Clock className="h-3 w-3" />
                  Pending Approval
                </span>
              )}
              {!isPending && req.urgency !== 'routine' && (
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${urgencyMeta.text}`}>
                  <span className={`h-2 w-2 rounded-full ${urgencyMeta.dot}`} />
                  {urgencyMeta.label}
                </span>
              )}
            </div>
            <div className="text-sm font-medium text-gray-700 truncate">{req.title}</div>
            <div className="flex flex-wrap gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {req.requested_on_behalf_of
                  ? `${req.requested_on_behalf_of} · via ${requesterName}`
                  : requesterName}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
              </span>
              {req.required_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(req.required_date), 'dd MMM yyyy')}
                </span>
              )}
              <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <ChevronDown className={`h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/50">

          {/* Items */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</h3>
            <div className="space-y-2">
              {[...items]
                .sort((a, b) => a.line_number - b.line_number)
                .map(item => (
                  <ItemLine key={item.id} item={item} isRelease={isRelease} />
                ))}
            </div>
          </div>

          {/* Extra context */}
          {(req.description || req.preferred_vendor || req.preferred_vendor_free_text) && (
            <div className="rounded-lg bg-white border border-gray-100 px-3 py-2.5 space-y-1.5 text-sm">
              {req.description && <p className="text-gray-600 text-xs">{req.description}</p>}
              {(req.preferred_vendor || req.preferred_vendor_free_text) && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Truck className="h-3.5 w-3.5 text-gray-400" />
                  Preferred vendor: <strong className="ml-0.5">{req.preferred_vendor?.name ?? req.preferred_vendor_free_text}</strong>
                </div>
              )}
            </div>
          )}

          {/* Action panel — split by request type */}
          {isRelease ? (
            <InventoryReleaseActions
              req={req}
              approvers={approvers}
              isPending={isPending}
              onDone={() => setDone(true)}
            />
          ) : (
            <PurchaseActions
              req={req}
              approvers={approvers}
              onDone={() => setDone(true)}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ProcurementReviewClient({
  submittedRequirements,
  pendingApprovalRequirements,
  approvers,
  userRole,
  currentUserId,
}: Props) {
  const canDecide = ['procurement_manager', 'procurement_officer', 'admin', 'super_admin', 'approver'].includes(userRole)

  const totalCount = submittedRequirements.length + pendingApprovalRequirements.length

  if (totalCount === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-16 text-center">
        <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-700">All clear</h3>
        <p className="text-sm text-gray-400 mt-1">No requirements waiting for review.</p>
      </div>
    )
  }

  if (!canDecide) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700 text-center">
        You do not have permission to make procurement decisions.
      </div>
    )
  }

  function Section({
    title,
    reqs,
    isPending,
    color,
    count,
  }: {
    title: string
    reqs: Requirement[]
    isPending: boolean
    color: string
    count: number
  }) {
    if (reqs.length === 0) return null
    return (
      <div className="space-y-2">
        <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${color}`}>
          {title}
          <span className="rounded-full bg-gray-200 text-gray-600 px-1.5 py-0.5 text-[10px] font-semibold">{count}</span>
        </div>
        {reqs.map(r => (
          <RequirementCard key={r.id} req={r} approvers={approvers} isPending={isPending} />
        ))}
      </div>
    )
  }

  // Sort submitted by urgency then date
  const critical = submittedRequirements.filter(r => r.urgency === 'critical')
  const urgent   = submittedRequirements.filter(r => r.urgency === 'urgent')
  const routine  = submittedRequirements.filter(r => !['critical','urgent'].includes(r.urgency))

  return (
    <div className="space-y-8">
      {pendingApprovalRequirements.length > 0 && (
        <Section title="Awaiting Your Approval" reqs={pendingApprovalRequirements} isPending color="text-blue-600" count={pendingApprovalRequirements.length} />
      )}
      <Section title="Critical" reqs={critical} isPending={false} color="text-red-600"    count={critical.length} />
      <Section title="Urgent"   reqs={urgent}   isPending={false} color="text-orange-600" count={urgent.length} />
      <Section title="Routine"  reqs={routine}  isPending={false} color="text-gray-500"   count={routine.length} />
    </div>
  )
}
