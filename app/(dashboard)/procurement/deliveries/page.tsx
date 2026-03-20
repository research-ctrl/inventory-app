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
      />

      <DataTable
        data={deliveries}
        columns={deliveryColumns}
        searchPlaceholder="Search by delivery reference…"
        searchColumn="delivery_ref"
      />
    </div>
  )
}
