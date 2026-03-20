'use server'
import { createClient } from '@/lib/supabase/server'
import type { CreatePurchaseOrderInput } from '@/lib/validations/po'

export async function dbCreatePurchaseOrder(input: CreatePurchaseOrderInput, userId: string) {
  const sb = await createClient()
  const { items, ...po } = input

  const totalAmount = items.reduce((sum, item) => {
    const line = item.quantity * item.unit_price * (1 - (item.discount_rate ?? 0) / 100) * (1 + (item.tax_rate ?? 0) / 100)
    return sum + line
  }, 0)

  const { data: order, error } = await sb
    .from('purchase_orders')
    .insert({ ...po, created_by: userId, status: 'draft', total_amount: Math.round(totalAmount * 100) / 100 })
    .select()
    .single()
  if (error) throw new Error(error.message)

  if (items.length > 0) {
    const { error: itemErr } = await sb.from('po_items').insert(
      items.map((item) => ({ ...item, po_id: order.id }))
    )
    if (itemErr) throw new Error(itemErr.message)
  }
  return order
}

export async function dbTransitionPurchaseOrder(id: string, toStatus: string, actorId: string, comment?: string) {
  const sb = await createClient()
  const { data: current } = await sb.from('purchase_orders').select('status').eq('id', id).single()

  const extra: Record<string, any> = {}
  if (toStatus === 'approved') { extra.approved_by = actorId; extra.approved_at = new Date().toISOString() }
  if (toStatus === 'ordered') { extra.ordered_by = actorId; extra.ordered_at = new Date().toISOString() }
  if (toStatus === 'rejected') extra.rejection_reason = comment

  const { error } = await sb.from('purchase_orders').update({ status: toStatus as any, ...extra }).eq('id', id)
  if (error) throw new Error(error.message)

  await sb.from('workflow_history').insert({
    entity_type: 'purchase_order', entity_id: id,
    from_status: current?.status as any, to_status: toStatus as any,
    event: toStatus as any, actor_id: actorId, comment,
  })
}

export async function dbCreatePayment(payment: {
  po_id: string; payment_ref: string; amount: number; currency: string
  payment_date?: string | null; payment_method: string; bank_reference?: string; notes?: string
}, actorId: string) {
  const sb = await createClient()
  const { error, data } = await sb.from('payments').insert({ ...payment, processed_by: actorId }).select().single()
  if (error) throw new Error(error.message)
  return data
}
