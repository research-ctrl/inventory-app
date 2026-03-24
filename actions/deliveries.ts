'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'
import { can } from '@/lib/permissions/checks'
import { CreateDeliverySchema } from '@/lib/validations/delivery'
import { dbCreateDelivery, dbTransitionDelivery } from '@/lib/db/mutations/deliveries'
import { dbMarkDeliveryReceived, dbSendDeliveryToQC } from '@/lib/db/mutations/receiving'
import { canTransition } from '@/lib/workflow/transitions'
import type { CreateDeliveryInput } from '@/lib/validations/delivery'

function revalidateDeliveryPaths(id?: string) {
  revalidatePath('/procurement/deliveries')
  if (id) revalidatePath(`/procurement/deliveries/${id}`)
  revalidatePath('/qc')
}

export async function createDelivery(formData: CreateDeliveryInput) {
  try {
    const { profile, role } = await getServerSession()
    if (!can(role, 'delivery', 'create')) return { success: false, error: 'Insufficient permissions' }
    const parsed = CreateDeliverySchema.safeParse(formData)
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors }
    const data = await dbCreateDelivery(parsed.data, profile.id)
    revalidateDeliveryPaths()
    return { success: true, data }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function transitionDelivery(id: string, toStatus: string, locationId?: string) {
  try {
    const { profile, role } = await getServerSession()
    const sb = await createClient()
    const { data: delivery } = await sb.from('deliveries').select('status').eq('id', id).single()
    if (!canTransition('delivery', delivery?.status ?? null, toStatus, role as any)) {
      return { success: false, error: 'Transition not allowed for your role' }
    }
    await dbTransitionDelivery(id, toStatus, profile.id, locationId)
    revalidateDeliveryPaths(id)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export type ReceivingItemInput = {
  delivery_item_id: string
  quantity_received: number
  condition_notes?: string
}

/** Mark a delivery as received with item quantities (merged from receiving module) */
export async function markDeliveryReceived(
  deliveryId: string,
  items: ReceivingItemInput[],
  locationId: string | undefined,
  operatorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!operatorId) return { success: false, error: 'Operator identity required' }
    await dbMarkDeliveryReceived(deliveryId, items, locationId, operatorId)
    revalidateDeliveryPaths(deliveryId)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/** Send a received delivery to QC (merged from receiving module) */
export async function sendToQC(
  deliveryId: string,
  operatorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!operatorId) return { success: false, error: 'Operator identity required' }
    await dbSendDeliveryToQC(deliveryId, operatorId)
    revalidateDeliveryPaths(deliveryId)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
