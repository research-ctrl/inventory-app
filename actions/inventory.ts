'use server'
import { revalidatePath } from 'next/cache'
import { getServerSession } from '@/lib/auth/session'
import {
  dbIntakeDelivery,
  dbAdjustStock,
  dbTransferPin,
  dbScrapPin,
  dbHoldPin,
  dbReleaseHold,
} from '@/lib/db/mutations/inventory'
import { createClient } from '@/lib/supabase/server'
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
    revalidatePath(`/procurement/deliveries/${parsed.data.delivery_id}`)

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

// ─── Direct Stock Intake ───────────────────────────────────────────────────────
// Adds items to inventory directly (external purchases, opening stock,
// enquiry-based procurement, etc.) without requiring a formal PO/QC flow.

export interface DirectStockItem {
  /** Existing PIN id to add stock to — OR leave blank to create a new PIN */
  pin_id?: string
  description: string
  part_number?: string
  category?: string
  unit: string
  quantity: number
  unit_cost?: number
  location_id: string
  vendor_id?: string
  notes?: string
}

export async function addStockDirectly(
  items: DirectStockItem[],
  reference?: string  // e.g. "External purchase" or "Enquiry REQ-000123"
): Promise<{ success: boolean; pins?: any[]; error?: string }> {
  try {
    const { profile } = await getServerSession()
    const sb = await createClient()
    const createdPins: any[] = []

    for (const item of items) {
      let pinId = item.pin_id

      if (!pinId) {
        // Create a new inventory PIN
        const { data: pin, error: pinErr } = await sb
          .from('inventory_pins')
          .insert({
            description: item.description,
            part_number: item.part_number ?? null,
            category: item.category ?? null,
            unit: item.unit,
            location_id: item.location_id,
            vendor_id: item.vendor_id ?? null,
            status: 'approved',
            origin_type: 'procurement',
            origin_reference: reference ?? 'direct_intake',
          })
          .select()
          .single()
        if (pinErr || !pin) throw new Error(pinErr?.message ?? 'Failed to create PIN')
        pinId = (pin as any).id
        createdPins.push(pin)
      } else {
        createdPins.push({ id: pinId, description: item.description })
      }

      // Get current stock
      const { data: txRows } = await sb
        .from('inventory_transactions')
        .select('quantity')
        .eq('pin_id', pinId)
      const currentStock = (txRows ?? []).reduce((s: number, t: any) => s + (t.quantity ?? 0), 0)

      // Create receipt transaction
      const { error: txErr } = await sb.from('inventory_transactions').insert({
        pin_id: pinId,
        transaction_type: 'receipt',
        quantity: item.quantity,
        quantity_before: currentStock,
        quantity_after: currentStock + item.quantity,
        reference_type: 'manual',
        reference_id: null,
        location_id: item.location_id,
        unit_cost: item.unit_cost ?? null,
        notes: item.notes
          ? item.notes
          : reference
          ? `Direct intake — ${reference}`
          : 'Direct stock intake',
        actor_id: profile.id,
      })
      if (txErr) throw new Error(txErr.message)
    }

    revalidatePath('/inventory')
    revalidatePath('/inventory/pins')
    return { success: true, pins: createdPins }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
