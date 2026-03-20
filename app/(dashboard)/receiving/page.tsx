import Link from 'next/link'
import { getDeliveries } from '@/lib/db/queries/deliveries'
import { DataTable } from '@/components/shared/data-table'
import { PageHeader } from '@/components/shared/page-header'
import { deliveryColumns } from '@/components/procurement/delivery-columns'
import { StatusBadge } from '@/components/shared/status-badge'

export const metadata = { title: 'Receiving | SMLS' }

// Statuses relevant to the receiving workflow
const RECEIVING_STATUSES = ['pending_approval', 'received', 'qc_pending']

export default async function ReceivingPage() {
  // Fetch pending and recently received deliveries
  const [pendingDeliveries, receivedDeliveries, qcPendingDeliveries] = await Promise.all([
    getDeliveries({ status: 'pending_approval' }),
    getDeliveries({ status: 'received' }),
    getDeliveries({ status: 'qc_pending' }),
  ])

  const allDeliveries = [
    ...pendingDeliveries,
    ...receivedDeliveries,
    ...qcPendingDeliveries,
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receiving Dock"
        description="Incoming deliveries pending receipt and QC"
      >
        <Link
          href="/procurement/deliveries"
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          All Deliveries
        </Link>
      </PageHeader>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="text-xs font-medium text-amber-700 uppercase tracking-wide">Pending Receipt</div>
          <div className="mt-1 text-2xl font-bold text-amber-700">{pendingDeliveries.length}</div>
        </div>
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-5">
          <div className="text-xs font-medium text-teal-700 uppercase tracking-wide">Received, Awaiting QC</div>
          <div className="mt-1 text-2xl font-bold text-teal-700">{receivedDeliveries.length}</div>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
          <div className="text-xs font-medium text-yellow-700 uppercase tracking-wide">In QC</div>
          <div className="mt-1 text-2xl font-bold text-yellow-700">{qcPendingDeliveries.length}</div>
        </div>
      </div>

      {/* Active deliveries table */}
      {allDeliveries.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center text-sm text-gray-400">
          No deliveries pending receipt or in the receiving workflow.
        </div>
      ) : (
        <DataTable
          data={allDeliveries}
          columns={deliveryColumns}
          searchPlaceholder="Search by delivery ref or PO…"
          searchColumn="delivery_ref"
        />
      )}
    </div>
  )
}
