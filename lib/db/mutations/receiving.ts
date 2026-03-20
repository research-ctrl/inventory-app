'use server'
import { createClient } from '@/lib/supabase/server'

export type ReceivingItem = {
  delivery_item_id: string
  quantity_received: number
  condition_notes?: string
}

/**
 * Mark a delivery as received: update each delivery_item, set delivery status,
 * and record workflow history.
 */
export async function dbMarkDeliveryReceived(
  deliveryId: string,
  items: ReceivingItem[],
  locationId: string | undefined,
  operatorId: string
): Promise<void> {
  const sb = await createClient()

  // 1. Update each delivery_item quantity_received and condition_notes
  for (const item of items) {
    const { error } = await sb
      .from('delivery_items')
      .update({
        quantity_received: item.quantity_received,
        condition_notes: item.condition_notes ?? null,
      })
      .eq('id', item.delivery_item_id)
    if (error) throw new Error(`delivery_items update: ${error.message}`)
  }

  // 2. Update delivery record
  const { error: dError } = await sb
    .from('deliveries')
    .update({
      status: 'received',
      actual_received_date: new Date().toISOString(),
      received_by: operatorId,
      ...(locationId ? { receiving_location_id: locationId } : {}),
    })
    .eq('id', deliveryId)
  if (dError) throw new Error(dError.message)

  // 3. Workflow history
  await sb.from('workflow_history').insert({
    entity_type: 'delivery',
    entity_id: deliveryId,
    from_status: 'pending_approval',
    to_status: 'received',
    event: 'receive',
    actor_id: operatorId,
  })
}

/**
 * Advance a received delivery to QC pending status.
 */
export async function dbSendDeliveryToQC(
  deliveryId: string,
  operatorId: string
): Promise<void> {
  const sb = await createClient()

  const { error } = await sb
    .from('deliveries')
    .update({ status: 'qc_pending' })
    .eq('id', deliveryId)
  if (error) throw new Error(error.message)

  await sb.from('workflow_history').insert({
    entity_type: 'delivery',
    entity_id: deliveryId,
    from_status: 'received',
    to_status: 'qc_pending',
    event: 'send_to_qc',
    actor_id: operatorId,
  })
}
