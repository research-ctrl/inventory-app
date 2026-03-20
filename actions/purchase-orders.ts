'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'
import { can } from '@/lib/permissions/checks'
import { CreatePurchaseOrderSchema, PaymentSchema } from '@/lib/validations/po'
import { dbCreatePurchaseOrder, dbTransitionPurchaseOrder, dbCreatePayment } from '@/lib/db/mutations/purchase-orders'
import { canTransition } from '@/lib/workflow/transitions'
import type { CreatePurchaseOrderInput, PaymentInput } from '@/lib/validations/po'

export async function createPurchaseOrder(formData: CreatePurchaseOrderInput) {
  try {
    const { profile, role } = await getServerSession()
    if (!can(role, 'purchase_order', 'create')) return { success: false, error: 'Insufficient permissions' }
    const parsed = CreatePurchaseOrderSchema.safeParse(formData)
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors }
    const data = await dbCreatePurchaseOrder(parsed.data, profile.id)
    revalidatePath('/procurement/purchase-orders')
    return { success: true, data }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function transitionPurchaseOrder(id: string, toStatus: string, comment?: string) {
  try {
    const { profile, role } = await getServerSession()
    const sb = await createClient()
    const { data: po } = await sb.from('purchase_orders').select('status').eq('id', id).single()
    if (!canTransition('purchase_order', po?.status ?? null, toStatus, role as any)) {
      return { success: false, error: 'Transition not allowed for your role' }
    }
    await dbTransitionPurchaseOrder(id, toStatus, profile.id, comment)
    revalidatePath('/procurement/purchase-orders')
    revalidatePath(`/procurement/purchase-orders/${id}`)
    revalidatePath('/approvals')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function createPayment(formData: PaymentInput) {
  try {
    const { profile, role } = await getServerSession()
    if (!can(role, 'payment', 'create')) return { success: false, error: 'Insufficient permissions' }
    const parsed = PaymentSchema.safeParse(formData)
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors }
    const data = await dbCreatePayment(parsed.data, profile.id)
    revalidatePath('/procurement/payments')
    revalidatePath(`/procurement/purchase-orders/${formData.po_id}`)
    return { success: true, data }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
