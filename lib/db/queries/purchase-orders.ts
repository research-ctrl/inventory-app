'use server'
import { createClient } from '@/lib/supabase/server'

export type PurchaseOrderRow = {
  id: string
  po_number: string
  status: string
  total_amount: number
  currency: string
  expected_delivery: string | null
  created_at: string
  vendor: { id: string; name: string; code: string } | null
  requirement: { id: string; ref_number: string; title: string } | null
  created_by_profile: { id: string; full_name: string | null } | null
}

export async function getPurchaseOrders(filters?: { status?: string; vendor_id?: string; search?: string }): Promise<PurchaseOrderRow[]> {
  const sb = await createClient()
  let query = sb
    .from('purchase_orders')
    .select(`
      id, po_number, status, total_amount, currency, expected_delivery, created_at,
      vendor:vendors(id, name, code),
      requirement:requirements(id, ref_number, title),
      created_by_profile:profiles!purchase_orders_created_by_fkey(id, full_name)
    `)
    .order('created_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.vendor_id) query = query.eq('vendor_id', filters.vendor_id)
  if (filters?.search) query = query.ilike('po_number', `%${filters.search}%`)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as PurchaseOrderRow[]
}

export async function getPurchaseOrderById(id: string) {
  const sb = await createClient()
  const { data, error } = await sb
    .from('purchase_orders')
    .select(`
      *,
      vendor:vendors(id, name, code, email, phone, city, country, payment_terms_days),
      requirement:requirements(id, ref_number, title, urgency),
      po_items(*),
      created_by_profile:profiles!purchase_orders_created_by_fkey(id, full_name, email),
      approved_by_profile:profiles!purchase_orders_approved_by_fkey(id, full_name),
      deliveries(id, delivery_ref, status, actual_received_date),
      payments(id, payment_ref, amount, currency, status, payment_date)
    `)
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getPayments(po_id?: string) {
  const sb = await createClient()
  let query = sb
    .from('payments')
    .select(`*, purchase_orders(po_number, vendor:vendors(name))`)
    .order('created_at', { ascending: false })
  if (po_id) query = query.eq('po_id', po_id)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}
