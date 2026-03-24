import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'
import { getAvailableTransitions } from '@/lib/workflow/transitions'
import DeliveryDetail from '@/components/receiving/delivery-detail'

export const metadata = { title: 'Delivery Detail | SMLS' }

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DeliveryDetailPage({ params }: PageProps) {
  const { id } = await params
  const sb = await createClient()
  const { role } = await getServerSession()

  const { data: delivery, error } = await sb
    .from('deliveries')
    .select(`
      id, delivery_ref, status, supplier_delivery_note, tracking_number,
      carrier, expected_date, actual_received_date, notes, created_at,
      purchase_order:purchase_orders(
        id, po_number, currency,
        vendor:vendors(id, name, email),
        po_items(id, line_number, description, part_number, quantity, unit, unit_price)
      ),
      delivery_items(
        id, line_number, description, part_number,
        quantity_expected, quantity_received, unit, condition_notes, is_partial
      ),
      received_by_profile:profiles!deliveries_received_by_fkey(id, full_name),
      location:store_locations(id, code, name),
      qc_inspections(id, inspection_ref, status, result, inspection_date)
    `)
    .eq('id', id)
    .single()

  if (error || !delivery) return notFound()

  const availableTransitions = getAvailableTransitions('delivery', delivery.status, role as any)

  const { data: storeLocations } = await sb
    .from('store_locations')
    .select('id, code, name, warehouse, zone')
    .eq('is_active', true)
    .order('code')

  return (
    <div className="space-y-6">
      <DeliveryDetail
        delivery={delivery as any}
        availableTransitions={availableTransitions}
        storeLocations={storeLocations ?? []}
        currentRole={role}
      />
    </div>
  )
}
