'use server'
import { revalidatePath } from 'next/cache'
import {
  dbIntakeDelivery,
  dbAdjustStock,
  dbTransferPin,
  dbScrapPin,
  dbHoldPin,
  dbReleaseHold,
} from '@/lib/db/mutations/inventory'
import {
  IntakeDeliverySchema,
  AdjustStockSchema,
  TransferPinSchema,
} from '@/lib/validations/inventory'
import type {
  IntakeDeliveryInput,
  AdjustStockInput,
  TransferPinInput,
} from '@/lib/validations/inventory'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/actions/notifications'
import { sendItemStockedNotification } from '@/lib/email/send'

export async function intakeDelivery(
  formData: IntakeDeliveryInput,
  operatorId: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    if (!operatorId) return { success: false, error: 'Operator identity required' }
    const parsed = IntakeDeliverySchema.safeParse(formData)
    if (!parsed.success) return { success: false, error: JSON.stringify(parsed.error.flatten()) }
    const pins = await dbIntakeDelivery(parsed.data, operatorId)
    revalidatePath('/inventory')
    revalidatePath('/inventory/pins')
    revalidatePath(`/receiving/${parsed.data.delivery_id}`)

    // Fire-and-forget: notify the original requester that their items have arrived
    notifyRequesterOnReceipt(parsed.data.delivery_id).catch(() => {})

    return { success: true, data: pins }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/**
 * After a delivery is receipted into inventory, trace back to the original requirement
 * and notify the requester by in-app notification + email.
 */
async function notifyRequesterOnReceipt(deliveryId: string): Promise<void> {
  try {
    const sb = await createClient()

    // Trace: delivery → PO → requirement
    const { data: delivery } = await sb
      .from('deliveries')
      .select('id, po_id')
      .eq('id', deliveryId)
      .single()
    if (!delivery || !(delivery as any).po_id) return

    const { data: po } = await sb
      .from('purchase_orders')
      .select('id, requirement_id')
      .eq('id', (delivery as any).po_id)
      .single()
    if (!po || !(po as any).requirement_id) return

    const { data: req } = await sb
      .from('requirements')
      .select('id, ref_number, requested_by, title')
      .eq('id', (po as any).requirement_id)
      .single()
    if (!req || !(req as any).requested_by) return

    const { data: requester } = await sb
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', (req as any).requested_by)
      .single()
    if (!requester) return

    const reqRef  = (req as any).ref_number ?? (req as any).id
    const itemDesc = (req as any).title ?? 'Your requested item'

    await createNotification({
      recipientId: (requester as any).id,
      entityType:  'requirement',
      entityId:    (req as any).id,
      title:       `Items received — ${reqRef}`,
      body:        `${itemDesc} has been received and is now available in inventory.`,
    })

    if ((requester as any).email) {
      await sendItemStockedNotification({
        requesterEmail:  (requester as any).email,
        requesterName:   (requester as any).full_name ?? (requester as any).email,
        ref:             reqRef,
        pinDescription:  itemDesc,
        requirementId:   (req as any).id,
      })
    }
  } catch {
    // Non-fatal
  }
}

export async function adjustStock(
  formData: AdjustStockInput,
  operatorId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const parsed = AdjustStockSchema.safeParse(formData)
    if (!parsed.success) return { success: false, error: JSON.stringify(parsed.error.flatten()) }
    const result = await dbAdjustStock(parsed.data, operatorId)
    revalidatePath('/inventory')
    revalidatePath(`/inventory/pins/${parsed.data.pin_id}`)
    return { success: true, data: result }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function transferPin(
  formData: TransferPinInput,
  operatorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = TransferPinSchema.safeParse(formData)
    if (!parsed.success) return { success: false, error: JSON.stringify(parsed.error.flatten()) }
    await dbTransferPin(parsed.data, operatorId)
    revalidatePath('/inventory/pins')
    revalidatePath(`/inventory/pins/${parsed.data.pin_id}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function scrapPin(
  pinId: string,
  quantity: number,
  reason: string,
  operatorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbScrapPin(pinId, quantity, reason, operatorId)
    revalidatePath('/inventory/pins')
    revalidatePath(`/inventory/pins/${pinId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function holdPin(
  pinId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbHoldPin(pinId, notes)
    revalidatePath('/inventory/pins')
    revalidatePath(`/inventory/pins/${pinId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function releaseHold(
  pinId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbReleaseHold(pinId)
    revalidatePath('/inventory/pins')
    revalidatePath(`/inventory/pins/${pinId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
