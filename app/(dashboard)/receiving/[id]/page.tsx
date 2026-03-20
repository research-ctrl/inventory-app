import { notFound } from 'next/navigation'
import { getServerSession } from '@/lib/auth/session'
import { getDeliveryById, getStoreLocations } from '@/lib/db/queries/deliveries'
import { getAvailableTransitions } from '@/lib/workflow/transitions'
import DeliveryDetail from '@/components/receiving/delivery-detail'
import type { UserRole } from '@/types/domain'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  try {
    const delivery = await getDeliveryById((await params).id)
    return { title: `${delivery.delivery_ref} | Receiving | SMLS` }
  } catch {
    return { title: 'Receiving | SMLS' }
  }
}

export default async function ReceivingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { role } = await getServerSession()

  let delivery
  try {
    delivery = await getDeliveryById((await params).id)
  } catch {
    notFound()
  }

  const storeLocations = await getStoreLocations()

  const availableTransitions = getAvailableTransitions('delivery', delivery.status, role as UserRole)

  return (
    <DeliveryDetail
      delivery={{
        id: delivery.id,
        delivery_ref: delivery.delivery_ref,
        status: delivery.status,
        supplier_delivery_note: delivery.supplier_delivery_note,
        tracking_number: delivery.tracking_number,
        carrier: delivery.carrier,
        expected_date: delivery.expected_date,
        actual_received_date: delivery.actual_received_date,
        notes: delivery.notes,
        created_at: delivery.created_at,
        purchase_order: delivery.purchase_order as any,
        delivery_items: delivery.delivery_items as any,
        received_by_profile: delivery.received_by_profile as any,
        location: delivery.location as any,
        qc_inspections: (delivery.qc_inspections ?? []) as any,
      }}
      availableTransitions={availableTransitions}
      storeLocations={storeLocations}
      currentRole={role}
    />
  )
}
