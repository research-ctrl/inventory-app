'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'
import { can } from '@/lib/permissions/checks'
import { CreatePurchaseOrderSchema, PaymentSchema } from '@/lib/validations/po'
import { dbCreatePurchaseOrder, dbTransitionPurchaseOrder, dbCreatePayment } from '@/lib/db/mutations/purchase-orders'
import { dbCreateApproval } from '@/lib/db/mutations/approvals'
import { canTransition } from '@/lib/workflow/transitions'
import type { CreatePurchaseOrderInput, PaymentInput } from '@/lib/validations/po'

const APPROVER_ROLES = ['approver', 'procurement_manager', 'admin', 'super_admin'] as const

async function findApprover(sb: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data } = await sb
    .from('profiles')
    .select('id, role')
    .in('role', [...APPROVER_ROLES] as string[])
  if (!data || data.length === 0) return null
  for (const role of APPROVER_ROLES) {
    const found = data.find((p: any) => p.role === role)
    if (found) return found.id
  }
  return (data[0] as any).id
}

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

    // When submitted for approval → create an approval record automatically
    if (toStatus === 'pending_approval') {
      const approverId = await findApprover(sb)
      if (approverId) {
        const due = new Date()
        due.setDate(due.getDate() + 3)
        await dbCreateApproval('purchase_order', id, approverId, 1, due.toISOString().split('T')[0])
      }
    }

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
