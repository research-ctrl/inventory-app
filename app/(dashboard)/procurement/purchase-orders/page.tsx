import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getPurchaseOrders } from '@/lib/db/queries/purchase-orders'
import { getServerSession } from '@/lib/auth/session'
import { DataTable } from '@/components/shared/data-table'
import { PageHeader } from '@/components/shared/page-header'
import { poColumns } from '@/components/procurement/po-columns'

export const metadata = { title: 'Purchase Orders | SMLS' }

const CREATE_ROLES = ['admin', 'super_admin', 'procurement_manager', 'procurement_officer']

export default async function PurchaseOrdersPage() {
  const { role } = await getServerSession()
  const canCreate = CREATE_ROLES.includes(role)

  const orders = await getPurchaseOrders()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description={`${orders.length} purchase order${orders.length !== 1 ? 's' : ''} total`}
      >
        {canCreate && (
          <Link
            href="/procurement/purchase-orders/new"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New PO
          </Link>
        )}
      </PageHeader>

      <DataTable
        data={orders}
        columns={poColumns}
        searchPlaceholder="Search by PO number…"
        searchColumn="po_number"
      />
    </div>
  )
}
