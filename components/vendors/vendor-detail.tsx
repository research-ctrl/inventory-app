'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Star, Mail, Phone, Globe, MapPin, Building2, Tag, CreditCard, Edit2 } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { PageHeader } from '@/components/shared/page-header'
import VendorForm from '@/components/vendors/vendor-form'
import { approveVendor, rejectVendor } from '@/actions/vendors'

interface VendorContact {
  id: string
  name: string
  designation: string | null
  email: string | null
  phone: string | null
  is_primary: boolean
}

interface PoSummaryRow {
  id?: string
  po_number?: string | null
  status?: string | null
  vendor_name?: string | null
  total_amount?: number | null
  currency?: string | null
  expected_delivery?: string | null
  created_at?: string | null
}

interface VendorDetailProps {
  vendor: {
    id: string
    code: string
    name: string
    trade_name: string | null
    email: string | null
    phone: string | null
    website: string | null
    address_line1: string | null
    address_line2: string | null
    city: string | null
    country: string | null
    postal_code: string | null
    category: string | null
    rating: number | null
    payment_terms_days: number | null
    currency: string | null
    tax_id: string | null
    notes: string | null
    is_approved: boolean
    blacklisted: boolean
    blacklist_reason: string | null
    approved_at: string | null
    vendor_contacts?: VendorContact[]
  }
  purchaseOrders: PoSummaryRow[]
  role: string
}

type Tab = 'overview' | 'contacts' | 'pos' | 'edit'

const APPROVER_ROLES = ['admin', 'super_admin', 'procurement_manager']

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-900">{value ?? <span className="text-gray-400">—</span>}</dd>
    </div>
  )
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-gray-400">—</span>
  const full = Math.floor(rating)
  const empty = 5 - full
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f${i}`} className="h-4 w-4 fill-amber-400 text-amber-400" />
      ))}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e${i}`} className="h-4 w-4 text-gray-300" />
      ))}
      <span className="ml-1 text-sm text-gray-600">{rating.toFixed(1)}</span>
    </span>
  )
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function fmtCurrency(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency ?? 'USD',
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function VendorDetail({ vendor, purchaseOrders, role }: VendorDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const canApprove = APPROVER_ROLES.includes(role)

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveVendor(vendor.id)
      if (result.error) {
        setActionMsg({ type: 'error', text: Object.values(result.error).flat().join(', ') })
      } else {
        setActionMsg({ type: 'success', text: 'Vendor approved successfully.' })
      }
    })
  }

  const handleReject = () => {
    if (!rejectReason.trim()) return
    startTransition(async () => {
      const result = await rejectVendor(vendor.id, rejectReason)
      if (result.error) {
        setActionMsg({ type: 'error', text: Object.values(result.error).flat().join(', ') })
      } else {
        setActionMsg({ type: 'success', text: 'Vendor rejected and blacklisted.' })
        setShowRejectModal(false)
      }
    })
  }

  const address = [
    vendor.address_line1,
    vendor.address_line2,
    vendor.city,
    vendor.country,
    vendor.postal_code,
  ]
    .filter(Boolean)
    .join(', ')

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'contacts', label: 'Contacts', count: vendor.vendor_contacts?.length ?? 0 },
    { id: 'pos', label: 'PO History', count: purchaseOrders.length },
    { id: 'edit', label: 'Edit' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={vendor.name}
        description={`${vendor.code}${vendor.trade_name ? ` · ${vendor.trade_name}` : ''}`}
      >
        {canApprove && !vendor.is_approved && !vendor.blacklisted && (
          <>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-3.5 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </button>
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </button>
          </>
        )}
        {vendor.is_approved && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 ring-1 ring-inset ring-green-200">
            <CheckCircle2 className="h-4 w-4" />
            Approved
          </span>
        )}
        {vendor.blacklisted && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-200">
            <XCircle className="h-4 w-4" />
            Blacklisted
          </span>
        )}
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

      {/* Blacklist reason */}
      {vendor.blacklisted && vendor.blacklist_reason && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span className="font-medium">Blacklist reason:</span> {vendor.blacklist_reason}
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

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 rounded-xl border border-gray-200 bg-white p-6">
            <InfoRow label="Vendor Code" value={<span className="font-mono">{vendor.code}</span>} />
            <InfoRow label="Category" value={<span className="capitalize">{vendor.category ?? '—'}</span>} />
            <InfoRow label="Rating" value={<StarRating rating={vendor.rating} />} />
            <InfoRow
              label="Email"
              value={
                vendor.email ? (
                  <a href={`mailto:${vendor.email}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                    <Mail className="h-3.5 w-3.5" />
                    {vendor.email}
                  </a>
                ) : null
              }
            />
            <InfoRow
              label="Phone"
              value={
                vendor.phone ? (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    {vendor.phone}
                  </span>
                ) : null
              }
            />
            <InfoRow
              label="Website"
              value={
                vendor.website ? (
                  <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                    <Globe className="h-3.5 w-3.5" />
                    {vendor.website.replace(/^https?:\/\//, '')}
                  </a>
                ) : null
              }
            />
            <InfoRow
              label="Address"
              value={
                address ? (
                  <span className="flex items-start gap-1">
                    <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                    {address}
                  </span>
                ) : null
              }
            />
            <InfoRow
              label="Payment Terms"
              value={
                vendor.payment_terms_days != null ? (
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5 text-gray-400" />
                    {vendor.payment_terms_days} days
                  </span>
                ) : null
              }
            />
            <InfoRow
              label="Currency"
              value={vendor.currency}
            />
            <InfoRow label="Tax ID" value={vendor.tax_id} />
            <InfoRow
              label="Approved"
              value={
                vendor.is_approved ? fmtDate(vendor.approved_at) : (
                  <span className="text-amber-600">Pending approval</span>
                )
              }
            />
          </div>

          {vendor.notes && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">{vendor.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {!vendor.vendor_contacts?.length ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">
              No contacts recorded for this vendor.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Designation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Primary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vendor.vendor_contacts!.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{contact.name}</td>
                    <td className="px-4 py-3 text-gray-600">{contact.designation ?? '—'}</td>
                    <td className="px-4 py-3">
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                          {contact.email}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{contact.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      {contact.is_primary && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          Primary
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'pos' && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {!purchaseOrders.length ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">
              No purchase orders for this vendor yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">PO Number</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Total Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Expected Delivery</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchaseOrders.map((po, idx) => (
                  <tr key={po.id ?? idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {po.id ? (
                        <Link
                          href={`/procurement/purchase-orders/${po.id}`}
                          className="font-mono text-blue-600 hover:underline text-sm"
                        >
                          {po.po_number ?? po.id}
                        </Link>
                      ) : (
                        <span className="font-mono text-sm">{po.po_number ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {po.status && <StatusBadge status={po.status} size="sm" />}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {fmtCurrency(po.total_amount, po.currency)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {fmtDate(po.expected_delivery)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {fmtDate(po.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'edit' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-6">Edit Vendor</h3>
          <VendorForm
            mode="edit"
            initialData={{
              id: vendor.id,
              code: vendor.code,
              name: vendor.name,
              trade_name: vendor.trade_name ?? '',
              category: vendor.category as any,
              email: vendor.email ?? '',
              phone: vendor.phone ?? '',
              website: vendor.website ?? '',
              address_line1: vendor.address_line1 ?? '',
              address_line2: vendor.address_line2 ?? '',
              city: vendor.city ?? '',
              country: vendor.country ?? '',
              postal_code: vendor.postal_code ?? '',
              payment_terms_days: vendor.payment_terms_days ?? 30,
              currency: (vendor.currency as any) ?? 'USD',
              tax_id: vendor.tax_id ?? '',
              notes: vendor.notes ?? '',
            }}
            onSuccess={() => setActiveTab('overview')}
          />
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Reject Vendor</h3>
            <p className="text-sm text-gray-500 mb-4">
              This will blacklist the vendor. Please provide a reason.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Rejection reason…"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                disabled={isPending || !rejectReason.trim()}
              >
                {isPending ? 'Processing…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
