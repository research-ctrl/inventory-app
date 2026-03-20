import Link from 'next/link'
import { getPayments } from '@/lib/db/queries/purchase-orders'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'

export const metadata = { title: 'Payments | SMLS' }

function fmtCurrency(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency ?? 'USD',
    maximumFractionDigits: 2,
  }).format(amount)
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default async function PaymentsPage() {
  const payments = await getPayments()

  const totalApproved = payments
    .filter((p: any) => ['approved', 'completed'].includes(p.status))
    .reduce((s: number, p: any) => s + (p.amount ?? 0), 0)

  const pendingCount = payments.filter((p: any) => p.status === 'pending_approval').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description={`${payments.length} payment record${payments.length !== 1 ? 's' : ''}`}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Records</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{payments.length}</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <div className="text-xs font-medium text-green-700 uppercase tracking-wide">Total Approved (USD equiv.)</div>
          <div className="mt-1 text-2xl font-bold text-green-700">
            {fmtCurrency(totalApproved, 'USD')}
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="text-xs font-medium text-amber-700 uppercase tracking-wide">Pending Approval</div>
          <div className="mt-1 text-2xl font-bold text-amber-700">{pendingCount}</div>
        </div>
      </div>

      {/* Payments table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {payments.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-gray-400">
            No payments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Payment Ref</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">PO Number</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Vendor</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Payment Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Bank Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((payment: any) => {
                  const po = payment.purchase_orders as any
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-sm text-gray-800">
                        {payment.payment_ref ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {po?.id ? (
                          <Link
                            href={`/procurement/purchase-orders/${po.id}`}
                            className="font-mono text-sm text-blue-600 hover:underline"
                          >
                            {po.po_number ?? '—'}
                          </Link>
                        ) : (
                          <span className="font-mono text-sm text-gray-500">{po?.po_number ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {po?.vendor?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {fmtCurrency(payment.amount, payment.currency)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 capitalize">
                        {payment.payment_method?.replace(/_/g, ' ') ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={payment.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {fmtDate(payment.payment_date)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {payment.bank_reference ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
