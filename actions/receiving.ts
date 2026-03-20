'use server'
import { revalidatePath } from 'next/cache'
import { dbMarkDeliveryReceived, dbSendDeliveryToQC } from '@/lib/db/mutations/receiving'

export type ReceivingItemInput = {
  delivery_item_id: string
  quantity_received: number
  condition_notes?: string
}

export async function markDeliveryReceived(
  deliveryId: string,
  items: ReceivingItemInput[],
  locationId: string | undefined,
  operatorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!operatorId) return { success: false, error: 'Operator identity required' }
    await dbMarkDeliveryReceived(deliveryId, items, locationId, operatorId)
    revalidatePath('/receiving')
    revalidatePath(`/receiving/${deliveryId}`)
    revalidatePath('/procurement/deliveries')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function sendToQC(
  deliveryId: string,
  operatorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!operatorId) return { success: false, error: 'Operator identity required' }
    await dbSendDeliveryToQC(deliveryId, operatorId)
    revalidatePath('/receiving')
    revalidatePath(`/receiving/${deliveryId}`)
    revalidatePath('/qc')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
