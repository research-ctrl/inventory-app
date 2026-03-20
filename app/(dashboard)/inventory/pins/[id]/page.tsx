import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import PinDetailPanel from '@/components/inventory/pin-detail-panel'
import Link from 'next/link'

export const metadata = { title: 'PIN Detail | SMLS' }

export default async function PinDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sb = await createClient()

  // Get PIN with all relations
  const { data: pin } = await sb
    .from('inventory_pins')
    .select(`
      *,
      location:store_locations(id, code, name, warehouse),
      parent_pin:inventory_pins!inventory_pins_parent_pin_id_fkey(id, pin_number, description),
      derived_pins:inventory_pins!inventory_pins_parent_pin_id_fkey(id, pin_number, description, status),
      recovery:recoveries!recoveries_derived_pin_id_fkey(id, recovery_ref, status, outcome)
    `)
    .eq('id', id)
    .single()

  if (!pin) notFound()

  // Current stock from view
  const { data: stockView } = await sb
    .from('v_stock_balance')
    .select('current_stock, is_low_stock')
    .eq('pin_id', id)
    .single()

  // Transaction history with actor names
  const { data: transactions } = await sb
    .from('inventory_transactions')
    .select('*, actor:profiles(full_name)')
    .eq('pin_id', id)
    .order('created_at', { ascending: false })
    .limit(100)

  // Issues for this PIN
  const { data: issues } = await sb
    .from('material_issues')
    .select(
      'id, issue_number, status, quantity, quantity_returned, issued_at, created_at, purpose, issued_to:profiles!material_issues_issued_to_fkey(full_name)'
    )
    .eq('pin_id', id)
    .order('created_at', { ascending: false })

  // Origin delivery/QC (if procurement origin)
  let originDelivery = null
  if (pin.origin_type === 'procurement' && pin.origin_reference) {
    const { data: qci } = await sb
      .from('qc_inspections')
      .select(
        'inspection_ref, delivery:deliveries(delivery_ref, purchase_order:purchase_orders(po_number, vendor:vendors(name)))'
      )
      .eq('id', pin.origin_reference)
      .single()
    originDelivery = qci
  }

  // Locations for transfer modal
  const { data: locations } = await sb
    .from('store_locations')
    .select('id, code, name, warehouse')
    .order('code')

  const currentStock = stockView?.current_stock ?? 0

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/inventory" className="hover:text-gray-700">Inventory</Link>
        <span>/</span>
        <Link href="/inventory/pins" className="hover:text-gray-700">PINs</Link>
        <span>/</span>
        <span className="font-mono text-gray-800">{pin.pin_number}</span>
      </div>

      <PageHeader title={pin.pin_number} description={pin.description}>
        <div className="flex items-center gap-3">
          <StatusBadge status={pin.status} />
          {stockView?.is_low_stock && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
              Low Stock
            </span>
          )}
          <span className="text-2xl font-bold text-gray-900">
            {currentStock}{' '}
            <span className="text-sm font-normal text-gray-500">{pin.unit}</span>
          </span>
        </div>
      </PageHeader>

      <PinDetailPanel
        pin={pin}
        currentStock={currentStock}
        transactions={transactions ?? []}
        issues={issues ?? []}
        originDelivery={originDelivery}
        locations={locations ?? []}
      />
    </div>
  )
}
