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
    return { success: true, data: pins }
  } catch (e: any) {
    return { success: false, error: e.message }
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
