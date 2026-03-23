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

/**
 * Auto-create a draft PO from an approved requirement.
 * vendor_id may be null (TBD) — procurement team must fill it in before submitting.
 */
export async function dbAutoCreatePOFromRequirement(
  requirementId: string,
  userId: string,
  vendorId?: string | null,
): Promise<any> {
  const sb = await createClient()

  const { data: req, error: reqErr } = await sb
    .from('requirements')
    .select('id, ref_number, title, currency, requirement_items(*)')
    .eq('id', requirementId)
    .single()
  if (reqErr || !req) throw new Error(reqErr?.message ?? 'Requirement not found')

  const reqItems: any[] = (req as any).requirement_items ?? []

  const poItems = reqItems.map((ri: any, idx: number) => ({
    requirement_item_id: ri.id,
    line_number:         ri.line_number ?? idx + 1,
    description:         ri.description,
    part_number:         ri.part_number ?? null,
    quantity:            ri.quantity,
    unit:                ri.unit,
    unit_price:          ri.estimated_unit_price ?? 0,
    currency:            ri.currency ?? (req as any).currency ?? 'USD',
    tax_rate:            0,
    discount_rate:       0,
  }))

  const totalAmount = poItems.reduce((sum: number, item: any) => sum + item.quantity * item.unit_price, 0)

  const poRow: Record<string, any> = {
    requirement_id: requirementId,
    created_by:     userId,
    status:         'pending_approval',
    currency:       (req as any).currency ?? 'USD',
    total_amount:   Math.round(totalAmount * 100) / 100,
    notes:          `Auto-created from approved requirement ${(req as any).ref_number ?? requirementId}. Please review and approve — procurement team should update vendor and pricing before the order is placed.`,
  }
  if (vendorId) poRow.vendor_id = vendorId

  const { data: order, error } = await sb
    .from('purchase_orders')
    .insert(poRow)
    .select()
    .single()
  if (error) throw new Error(error.message)

  if (poItems.length > 0) {
    const { error: itemErr } = await sb.from('po_items').insert(
      poItems.map((item: any) => ({ ...item, po_id: order.id }))
    )
    if (itemErr) throw new Error(itemErr.message)
  }

  return order
}

export async function dbUpdatePurchaseOrder(
  id: string,
  input: Omit<import('@/lib/validations/po').CreatePurchaseOrderInput, 'requirement_id'> & { requirement_id?: string | null },
) {
  const sb = await createClient()

  // Verify PO is in an editable state
  const { data: current } = await sb.from('purchase_orders').select('status').eq('id', id).single()
  if (!current) throw new Error('PO not found')
  if (!['draft', 'rejected'].includes(current.status)) throw new Error('Only draft or rejected POs can be edited')

  const { items, ...header } = input

  // Re-calculate total
  const totalAmount = items.reduce((sum, item) => {
    const line = item.quantity * item.unit_price * (1 - (item.discount_rate ?? 0) / 100) * (1 + (item.tax_rate ?? 0) / 100)
    return sum + line
  }, 0)

  // Update header
  const { error: headerErr } = await sb
    .from('purchase_orders')
    .update({ ...header, total_amount: Math.round(totalAmount * 100) / 100 })
    .eq('id', id)
  if (headerErr) throw new Error(headerErr.message)

  // Replace items: delete existing, insert new
  const { error: delErr } = await sb.from('po_items').delete().eq('po_id', id)
  if (delErr) throw new Error(delErr.message)

  if (items.length > 0) {
    const { error: itemErr } = await sb.from('po_items').insert(
      items.map((item, idx) => ({
        ...item,
        po_id: id,
        line_number: item.line_number ?? idx + 1,
      }))
    )
    if (itemErr) throw new Error(itemErr.message)
  }

  return { id, total_amount: Math.round(totalAmount * 100) / 100 }
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
