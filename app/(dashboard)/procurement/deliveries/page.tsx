import Link from 'next/link'
import { Package } from 'lucide-react'
import { getDeliveries } from '@/lib/db/queries/deliveries'
import { DataTable } from '@/components/shared/data-table'
import { PageHeader } from '@/components/shared/page-header'
import { deliveryColumns } from '@/components/procurement/delivery-columns'

export const metadata = { title: 'Deliveries | SMLS' }

export default async function DeliveriesPage() {
  const deliveries = await getDeliveries()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deliveries"
        description={`${deliveries.length} delivery record${deliveries.length !== 1 ? 's' : ''}`}
      >
        <Link
          href="/procurement/deliveries/new"
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors shadow-sm"
        >
          <Package className="h-4 w-4" />
          Record Delivery
        </Link>
      </PageHeader>

      <DataTable
        data={deliveries}
        columns={deliveryColumns}
        searchPlaceholder="Search by delivery reference…"
        searchColumn="delivery_ref"
      />
    </div>
  )
}
