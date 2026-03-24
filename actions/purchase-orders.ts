'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'
import { can } from '@/lib/permissions/checks'
import { CreatePurchaseOrderSchema, PaymentSchema } from '@/lib/validations/po'
import { dbCreatePurchaseOrder, dbUpdatePurchaseOrder, dbTransitionPurchaseOrder, dbCreatePayment } from '@/lib/db/mutations/purchase-orders'
import { dbCreateApproval } from '@/lib/db/mutations/approvals'
import { dbCreateDelivery } from '@/lib/db/mutations/deliveries'
import { canTransition } from '@/lib/workflow/transitions'
import type { CreatePurchaseOrderInput, PaymentInput } from '@/lib/validations/po'
import { sendPOPendingApproval, sendPOToVendor } from '@/lib/email/send'
import { getSystemSetting } from '@/actions/settings'

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

export async function updatePurchaseOrder(id: string, formData: CreatePurchaseOrderInput) {
  try {
    const { role } = await getServerSession()
    if (!can(role, 'purchase_order', 'update')) return { success: false, error: 'Insufficient permissions' }
    const parsed = CreatePurchaseOrderSchema.safeParse(formData)
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors }
    const data = await dbUpdatePurchaseOrder(id, parsed.data)
    revalidatePath('/procurement/purchase-orders')
    revalidatePath(`/procurement/purchase-orders/${id}`)
    return { success: true, data }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function transitionPurchaseOrder(id: string, toStatus: string, comment?: string) {
  try {
    const { profile, role, user } = await getServerSession()
    const sb = await createClient()
    const { data: po } = await sb
      .from('purchase_orders')
      .select('status, po_number, total_amount, currency, vendor_id, created_by, delivery_address, expected_delivery, notes')
      .eq('id', id)
      .single()

    if (!canTransition('purchase_order', po?.status ?? null, toStatus, role as any)) {
      return { success: false, error: 'Transition not allowed for your role' }
    }
    await dbTransitionPurchaseOrder(id, toStatus, profile.id, comment)

    // When submitted for approval → create approval record + email approver
    if (toStatus === 'pending_approval') {
      const approverId = await findApprover(sb)
      if (approverId) {
        const due = new Date()
        due.setDate(due.getDate() + 3)
        const dueDateStr = due.toISOString().split('T')[0]
        const newApproval = await dbCreateApproval('purchase_order', id, approverId, 1, dueDateStr)

        const { data: approver } = await sb.from('profiles').select('email, full_name').eq('id', approverId).single()
        const { data: vendor }   = await sb.from('vendors').select('name').eq('id', (po as any)?.vendor_id).single()

        if (approver?.email) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
          await sendPOPendingApproval({
            approverEmail:  approver.email,
            approverName:   approver.full_name ?? approver.email,
            ref:            (po as any)?.po_number ?? id,
            vendorName:     (vendor as any)?.name ?? 'Unknown Vendor',
            totalAmount:    `${(po as any)?.currency ?? 'USD'} ${((po as any)?.total_amount ?? 0).toLocaleString()}`,
            createdByName:  profile.full_name ?? user.email,
            dueDate:        dueDateStr,
            poId:           id,
            approvalToken:  (newApproval as any).approval_token,
            appUrl,
          })
        }
      }
    }

    // When placed (ordered) → email vendor + auto-create delivery record
    if (toStatus === 'ordered') {
      const { data: vendor } = await sb.from('vendors').select('name, email').eq('id', (po as any)?.vendor_id).single()
      const { data: poItems } = await sb.from('po_items').select('id, line_number, description, part_number, quantity, unit, unit_price, currency').eq('po_id', id)

      // Email vendor
      if ((vendor as any)?.email && poItems) {
        const companyName = await getSystemSetting('company_name')
        await sendPOToVendor({
          vendorEmail:      (vendor as any).email,
          vendorName:       (vendor as any).name,
          ref:              (po as any)?.po_number ?? id,
          items:            poItems as any,
          totalAmount:      `${(po as any)?.currency ?? 'USD'} ${((po as any)?.total_amount ?? 0).toLocaleString()}`,
          currency:         (po as any)?.currency ?? 'USD',
          expectedDelivery: (po as any)?.expected_delivery ?? undefined,
          deliveryAddress:  (po as any)?.delivery_address ?? undefined,
          notes:            (po as any)?.notes ?? undefined,
          companyName:      companyName || 'SMLS',
        })
      }

      // Auto-create delivery record so it appears in Deliveries
      if (poItems && poItems.length > 0) {
        try {
          const deliveryRef = `DLV-${Date.now()}`
          await dbCreateDelivery({
            po_id:         id,
            delivery_ref:  deliveryRef,
            expected_date: (po as any)?.expected_delivery ?? null,
            notes:         `Auto-created when PO ${(po as any)?.po_number ?? id} was placed.`,
            items: poItems.map((item: any, idx: number) => ({
              po_item_id:        item.id,
              line_number:       item.line_number ?? idx + 1,
              description:       item.description,
              part_number:       item.part_number ?? undefined,
              quantity_expected:  item.quantity,
              quantity_received:  0,
              unit:              item.unit,
            })),
          }, profile.id)
          revalidatePath('/procurement/deliveries')
          revalidatePath('/procurement/deliveries')
        } catch (dlvErr: any) {
          console.error('[transitionPO] Auto-delivery creation failed:', dlvErr.message || dlvErr)
        }
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

/** Manually send PO to vendor by email (callable from PO detail page) */
export async function sendPOEmailToVendor(poId: string) {
  try {
    const { role } = await getServerSession()
    if (!['super_admin', 'admin', 'procurement_manager', 'procurement_officer'].includes(role)) {
      return { success: false, error: 'Insufficient permissions' }
    }
    const sb = await createClient()
    const { data: po } = await sb
      .from('purchase_orders')
      .select('po_number, total_amount, currency, vendor_id, delivery_address, expected_delivery, notes')
      .eq('id', poId)
      .single()
    if (!po) return { success: false, error: 'PO not found' }

    const { data: vendor } = await sb.from('vendors').select('name, email').eq('id', (po as any).vendor_id).single()
    if (!(vendor as any)?.email) return { success: false, error: 'Vendor has no email address on file' }

    const { data: poItems } = await sb.from('po_items').select('description, quantity, unit, unit_price, currency').eq('po_id', poId)
    const companyName = await getSystemSetting('company_name')

    await sendPOToVendor({
      vendorEmail:      (vendor as any).email,
      vendorName:       (vendor as any).name,
      ref:              (po as any).po_number ?? poId,
      items:            (poItems ?? []) as any,
      totalAmount:      `${(po as any).currency ?? 'USD'} ${((po as any).total_amount ?? 0).toLocaleString()}`,
      currency:         (po as any).currency ?? 'USD',
      expectedDelivery: (po as any).expected_delivery ?? undefined,
      deliveryAddress:  (po as any).delivery_address ?? undefined,
      notes:            (po as any).notes ?? undefined,
      companyName:      companyName || 'SMLS',
    })
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
