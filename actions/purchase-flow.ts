'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'
import { can } from '@/lib/permissions/checks'
import {
  sendPurchaseRequestToApprover,
  sendPOForApproval,
  sendPOApprovedToPM,
  sendPOApprovedToAccounts,
} from '@/lib/email/send'
import { dbCreateDelivery } from '@/lib/db/mutations/deliveries'

function revalidateAll(requirementId?: string, poId?: string) {
  revalidatePath('/procurement/review')
  revalidatePath('/procurement/purchase-orders')
  revalidatePath('/requirements')
  if (requirementId) revalidatePath(`/requirements/${requirementId}`)
  if (poId) revalidatePath(`/procurement/purchase-orders/${poId}`)
}

// ─── Helper: fetch approvers ─────────────────────────────────────────────────

async function getApprovers(sb: any) {
  const { data } = await sb
    .from('profiles')
    .select('id, full_name, email, role')
    .in('role', ['approver', 'procurement_manager', 'admin', 'super_admin'])
    .order('full_name')
  return (data ?? []) as Array<{ id: string; full_name: string | null; email: string; role: string }>
}

async function getAccountsEmails(sb: any): Promise<string[]> {
  const { data } = await sb
    .from('profiles')
    .select('email')
    .eq('role', 'finance')
  return (data ?? []).map((p: any) => p.email).filter(Boolean)
}

// ─── 1. PM approves purchase requirement → creates PO ───────────────────────

/**
 * PM reviews a 'to_order' requirement and approves it.
 *
 * - Creates a PO in 'pending_approval' state from the requirement items.
 * - Sends PO to the assigned approver for sign-off.
 * - Requirement status → 'approved'.
 *
 * Returns the created PO id so the UI can navigate there.
 */
export async function approvePurchaseRequirement(
  requirementId: string,
  approverId: string,
  comment?: string,
) {
  try {
    const { profile, role, user } = await getServerSession()
    if (!can(role, 'requirement', 'update')) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const sb = await createClient()

    // Fetch requirement with items
    const { data: req, error: reqErr } = await sb
      .from('requirements')
      .select(`
        id, status, request_type, ref_number, title, urgency, currency,
        requested_by,
        requested_by_profile:profiles!requirements_requested_by_fkey (id, full_name, email),
        vessel:vessels (id, name),
        preferred_vendor:vendors!requirements_preferred_vendor_id_fkey (id, name),
        preferred_vendor_id,
        requirement_items (
          id, line_number, description, part_number,
          quantity, unit, estimated_unit_price, currency,
          inventory_pin_id, item_request_type
        )
      `)
      .eq('id', requirementId)
      .single()

    if (reqErr || !req) return { success: false, error: 'Requirement not found' }
    if ((req as any).status !== 'submitted') {
      return { success: false, error: `Requirement is "${(req as any).status}", not submitted` }
    }

    const items: any[] = (req as any).requirement_items ?? []
    const currency = (req as any).currency ?? 'USD'
    const vendorId = (req as any).preferred_vendor_id ?? null

    // Calculate total from item estimates
    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + (item.quantity ?? 0) * (item.estimated_unit_price ?? 0)
    }, 0)

    // Create PO in pending_approval state
    const { data: po, error: poErr } = await sb
      .from('purchase_orders')
      .insert({
        requirement_id: requirementId,
        vendor_id: vendorId,
        status: 'pending_approval',
        currency,
        total_amount: Math.round(totalAmount * 100) / 100,
        created_by: profile.id,
        notes: `Created from ${(req as any).ref_number ?? requirementId} — review pricing before ordering`,
      })
      .select()
      .single()

    if (poErr || !po) return { success: false, error: poErr?.message ?? 'Failed to create PO' }

    // Insert PO items (link back to inventory_pin for price history if column exists)
    if (items.length > 0) {
      const poItemsWithPin = items.map((item: any, idx: number) => ({
        po_id: po.id,
        inventory_pin_id: item.inventory_pin_id ?? null,
        requirement_item_id: item.id,
        line_number: item.line_number ?? idx + 1,
        description: item.description,
        part_number: item.part_number ?? null,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.estimated_unit_price ?? 0,
        currency: item.currency ?? currency,
        tax_rate: 0,
        discount_rate: 0,
      }))
      let { error: itemErr } = await sb.from('po_items').insert(poItemsWithPin)

      // If inventory_pin_id column doesn't exist yet (migration pending), retry without it
      if (itemErr?.message?.includes('inventory_pin_id')) {
        const poItemsNoPin = poItemsWithPin.map(({ inventory_pin_id, ...rest }) => rest)
        const { error: retryErr } = await sb.from('po_items').insert(poItemsNoPin)
        itemErr = retryErr ?? null
      }

      if (itemErr) {
        // Clean up orphan PO
        await sb.from('purchase_orders').delete().eq('id', po.id)
        return { success: false, error: itemErr.message }
      }
    }

    // Approve the requirement
    await sb.from('requirements').update({
      status: 'approved',
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
      procurement_decision_status: 'to_order',
      procurement_decision_made_at: new Date().toISOString(),
      procurement_decision_made_by: profile.id,
    }).eq('id', requirementId)

    // Assign approver to PO
    await sb.from('purchase_orders').update({
      assigned_approver_id: approverId,
    }).eq('id', po.id)

    // Workflow history
    await sb.from('workflow_history').insert({
      entity_type: 'requirement', entity_id: requirementId,
      from_status: 'submitted' as any, to_status: 'approved' as any,
      event: 'approve' as any, actor_id: profile.id, comment: comment ?? null,
      metadata: { po_id: po.id, approver_id: approverId },
    })
    await sb.from('workflow_history').insert({
      entity_type: 'purchase_order', entity_id: po.id,
      from_status: null as any, to_status: 'pending_approval' as any,
      event: 'create' as any, actor_id: profile.id,
      comment: `Created from requirement ${(req as any).ref_number}`,
    })

    // Fetch approver details and send email
    const { data: approverProfile } = await sb
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', approverId)
      .single()

    if (approverProfile?.email) {
      const vendor = (req as any).preferred_vendor
      sendPOForApproval({
        approverEmail: approverProfile.email,
        approverName: approverProfile.full_name ?? approverProfile.email,
        poId: po.id,
        poNumber: po.po_number ?? po.id,
        ref: (req as any).ref_number,
        title: (req as any).title,
        requesterName: (req as any).requested_by_profile?.full_name ?? (req as any).requested_by_profile?.email ?? 'Requester',
        urgency: (req as any).urgency,
        vendorName: vendor?.name ?? 'TBD',
        totalAmount: totalAmount.toFixed(2),
        currency,
        itemCount: items.length,
        createdByName: profile.full_name ?? user.email,
        requirementId,
      }).catch(() => {})
    }

    revalidateAll(requirementId, po.id)
    return { success: true, poId: po.id, poNumber: po.po_number }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ─── 2. Approver approves PO ─────────────────────────────────────────────────

/**
 * Assigned approver (or PM/admin) approves the purchase order.
 * - PO status → 'approved'
 * - Emails PM to proceed with ordering
 * - Emails accounts team about incoming invoice
 */
export async function approvePurchaseOrder(
  poId: string,
  comment?: string,
) {
  try {
    const { profile, role, user } = await getServerSession()
    if (!can(role, 'requirement', 'update')) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const sb = await createClient()

    const { data: po, error: poErr } = await sb
      .from('purchase_orders')
      .select(`
        id, po_number, status, total_amount, currency, requirement_id,
        vendor:vendors (id, name),
        requirement:requirements (id, ref_number, title, urgency)
      `)
      .eq('id', poId)
      .single()

    if (poErr || !po) return { success: false, error: 'PO not found' }
    if ((po as any).status !== 'pending_approval') {
      return { success: false, error: `PO is "${(po as any).status}", not pending approval` }
    }

    // Approve the PO
    const { error } = await sb.from('purchase_orders').update({
      status: 'approved',
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
    }).eq('id', poId)

    if (error) return { success: false, error: error.message }

    await sb.from('workflow_history').insert({
      entity_type: 'purchase_order', entity_id: poId,
      from_status: 'pending_approval' as any, to_status: 'approved' as any,
      event: 'approve' as any, actor_id: profile.id, comment: comment ?? null,
    })

    const poRef = (po as any).po_number ?? poId
    const vendorName = (po as any).vendor?.name ?? 'TBD'
    const req = (po as any).requirement
    const totalStr = `${(po as any).currency} ${Number((po as any).total_amount).toLocaleString()}`

    // Email all PMs to proceed with ordering
    const { data: pmProfiles } = await sb
      .from('profiles')
      .select('email, full_name')
      .in('role', ['procurement_manager', 'admin', 'super_admin'])

    const pmEmails = (pmProfiles ?? []).map((p: any) => p.email).filter(Boolean)
    for (const email of pmEmails) {
      sendPOApprovedToPM({
        pmEmail: email,
        poId,
        poNumber: poRef,
        vendorName,
        totalAmount: totalStr,
        approverName: profile.full_name ?? user.email,
        requirementRef: req?.ref_number,
        comment,
      }).catch(() => {})
    }

    // Email accounts team
    const accountsEmails = await getAccountsEmails(sb)
    if (accountsEmails.length > 0) {
      sendPOApprovedToAccounts({
        accountsEmails,
        poId,
        poNumber: poRef,
        vendorName,
        totalAmount: totalStr,
        currency: (po as any).currency,
        approverName: profile.full_name ?? user.email,
        requirementRef: req?.ref_number,
        requirementTitle: req?.title,
      }).catch(() => {})
    }

    revalidateAll((po as any).requirement_id ?? undefined, poId)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ─── 3. Decline PO ──────────────────────────────────────────────────────────

/**
 * PM or approver declines the purchase order.
 * PO status → 'rejected'. Requirement stays approved (can re-raise PO).
 */
export async function declinePurchaseOrder(
  poId: string,
  reason: string,
) {
  try {
    const { profile, role } = await getServerSession()
    if (!can(role, 'requirement', 'update')) {
      return { success: false, error: 'Insufficient permissions' }
    }
    if (!reason?.trim()) return { success: false, error: 'A reason is required' }

    const sb = await createClient()

    const { data: po } = await sb
      .from('purchase_orders')
      .select('id, status, requirement_id')
      .eq('id', poId)
      .single()

    if (!po) return { success: false, error: 'PO not found' }

    await sb.from('purchase_orders').update({
      status: 'rejected',
      rejection_reason: reason,
    }).eq('id', poId)

    await sb.from('workflow_history').insert({
      entity_type: 'purchase_order', entity_id: poId,
      from_status: (po as any).status as any, to_status: 'rejected' as any,
      event: 'reject' as any, actor_id: profile.id, comment: reason,
    })

    revalidateAll((po as any).requirement_id ?? undefined, poId)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ─── 4. Place Order ──────────────────────────────────────────────────────────

export async function placeOrder(
  poId: string,
  expectedDeliveryDate?: string,
  notes?: string,
) {
  try {
    const { profile, role } = await getServerSession()
    if (!can(role, 'requirement', 'update')) return { success: false, error: 'Insufficient permissions' }

    const sb = await createClient()

    const { data: po, error: poErr } = await sb
      .from('purchase_orders')
      .select('id, po_number, status, requirement_id')
      .eq('id', poId)
      .single()

    if (poErr || !po) return { success: false, error: 'PO not found' }
    if ((po as any).status !== 'approved') {
      return { success: false, error: `PO is "${(po as any).status}", not approved` }
    }

    const updateData: any = { status: 'ordered', ordered_at: new Date().toISOString() }
    if (expectedDeliveryDate) updateData.expected_delivery = expectedDeliveryDate
    if (notes) updateData.notes = notes

    const { error: updateErr } = await sb.from('purchase_orders').update(updateData).eq('id', poId)
    if (updateErr) return { success: false, error: updateErr.message }

    await sb.from('workflow_history').insert({
      entity_type: 'purchase_order', entity_id: poId,
      from_status: 'approved' as any, to_status: 'ordered' as any,
      event: 'place_order' as any, actor_id: profile.id,
      comment: notes ?? null,
    })

    const { data: poItems } = await sb
      .from('po_items')
      .select('id, line_number, description, part_number, quantity, unit')
      .eq('po_id', poId)

    if (poItems && poItems.length > 0) {
      try {
        await dbCreateDelivery({
          po_id: poId,
          delivery_ref: `DLV-${Date.now()}`,
          expected_date: expectedDeliveryDate ?? null,
          notes: `Order placed for PO ${(po as any).po_number ?? poId}.`,
          items: poItems.map((item: any, idx: number) => ({
            po_item_id: item.id,
            line_number: item.line_number ?? idx + 1,
            description: item.description,
            part_number: item.part_number ?? undefined,
            quantity_expected: item.quantity,
            quantity_received: 0,
            unit: item.unit,
          })),
        }, profile.id)
        revalidatePath('/procurement/deliveries')
      } catch (dlvErr: any) {
        console.error('[placeOrder] delivery creation failed:', dlvErr.message)
      }
    }

    revalidateAll((po as any).requirement_id ?? undefined, poId)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
