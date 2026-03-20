'use server'
import { createClient } from '@/lib/supabase/server'
import type { CreateDeliveryInput } from '@/lib/validations/delivery'

export async function dbCreateDelivery(input: CreateDeliveryInput, userId: string) {
  const sb = await createClient()
  const { items, ...delivery } = input

  const ref = `DLV-${Date.now()}`
  const { data, error } = await sb
    .from('deliveries')
    .insert({ ...delivery, delivery_ref: delivery.delivery_ref || ref, status: 'pending_approval', received_by: userId })
    .select()
    .single()
  if (error) throw new Error(error.message)

  if (items.length > 0) {
    await sb.from('delivery_items').insert(items.map(item => ({ ...item, delivery_id: data.id })))
  }
  return data
}

export async function dbTransitionDelivery(id: string, toStatus: string, actorId: string, locationId?: string) {
  const sb = await createClient()
  const { data: current } = await sb.from('deliveries').select('status').eq('id', id).single()

  const extra: Record<string, any> = {}
  if (toStatus === 'received') { extra.actual_received_date = new Date().toISOString(); extra.received_by = actorId }
  if (locationId) extra.receiving_location_id = locationId

  const { error } = await sb.from('deliveries').update({ status: toStatus as any, ...extra }).eq('id', id)
  if (error) throw new Error(error.message)

  await sb.from('workflow_history').insert({
    entity_type: 'delivery', entity_id: id,
    from_status: current?.status as any, to_status: toStatus as any,
    event: toStatus as any, actor_id: actorId,
  })
}
