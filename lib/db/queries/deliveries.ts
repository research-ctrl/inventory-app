'use server'
import { createClient } from '@/lib/supabase/server'

export type DeliveryRow = {
  id: string
  delivery_ref: string
  status: string
  expected_date: string | null
  actual_received_date: string | null
  created_at: string
  purchase_order: { id: string; po_number: string; vendor: { name: string } | null } | null
}

export async function getDeliveries(filters?: { status?: string; po_id?: string }): Promise<DeliveryRow[]> {
  const sb = await createClient()
  let query = sb
    .from('deliveries')
    .select(`
      id, delivery_ref, status, expected_date, actual_received_date, created_at,
      purchase_order:purchase_orders(id, po_number, vendor:vendors(name))
    `)
    .order('created_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.po_id) query = query.eq('po_id', filters.po_id)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as DeliveryRow[]
}

export async function getDeliveryById(id: string) {
  const sb = await createClient()
  const { data, error } = await sb
    .from('deliveries')
    .select(`
      *,
      purchase_order:purchase_orders(
        id, po_number, currency,
        vendor:vendors(id, name, email),
        po_items(id, line_number, description, part_number, quantity, unit, unit_price)
      ),
      delivery_items(*),
      received_by_profile:profiles!deliveries_received_by_fkey(id, full_name),
      location:store_locations(id, code, name)
    `)
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getStoreLocations() {
  const sb = await createClient()
  const { data } = await sb.from('store_locations').select('id, code, name, warehouse, zone').eq('is_active', true).order('code')
  return data ?? []
}
