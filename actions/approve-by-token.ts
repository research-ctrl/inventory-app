'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { dbDecideApprovalByToken, dbGetApprovalByToken } from '@/lib/db/mutations/approvals'
import { dbTransitionRequirement } from '@/lib/db/mutations/requirements'
import { dbTransitionPurchaseOrder, dbAutoCreatePOFromRequirement } from '@/lib/db/mutations/purchase-orders'
import { dbCreateApproval } from '@/lib/db/mutations/approvals'
import { dbCreateDelivery } from '@/lib/db/mutations/deliveries'
import {
  sendRequirementApproved,
  sendRequirementRejected,
  sendRequirementApprovedToAccounts,
  sendPOPendingApproval,
  sendPOApproved,
  sendPOApprovedToAccounts,
  sendPOToVendor,
} from '@/lib/email/send'
import { revalidatePath } from 'next/cache'
import { getSystemSetting } from '@/actions/settings'

/** Get accounts emails from DB settings or env */
async function getAccountsEmails(): Promise<string[]> {
  const adminSb = createAdminClient()
  const envEmails = (process.env.ACCOUNTS_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean)
  try {
    const { data } = await (adminSb as any)
      .from('system_settings').select('value').eq('key', 'accounts_emails').single()
    if (data?.value) {
      const dbEmails = data.value.split(',').map((e: string) => e.trim()).filter(Boolean)
      if (dbEmails.length) return dbEmails
    }
  } catch { /* fall through */ }
  return envEmails
}

export interface ApproveByTokenResult {
  ok: boolean
  error?: string
  entityType?: string
  entityRef?: string
  entityTitle?: string
  decision?: 'approve' | 'reject'
}

export async function approveByToken(
  token: string,
  decision: 'approve' | 'reject',
  comment?: string,
): Promise<ApproveByTokenResult> {
  try {
    const adminSb = createAdminClient()

    // Validate token and get approval
    const approval = await dbGetApprovalByToken(token)
    if (!approval) return { ok: false, error: 'This approval link is invalid or has expired.' }
    if ((approval as any).token_used_at) return { ok: false, error: 'This approval has already been decided.' }
    if ((approval as any).status !== 'pending_approval') {
      return { ok: false, error: `This item has already been ${(approval as any).status}.` }
    }

    // Record the decision
    const result = await dbDecideApprovalByToken(token, decision, comment)
    if (!result.ok) return { ok: false, error: result.error }

    const { entityType, entityId } = result
    const toStatus = decision === 'approve' ? 'approved' : 'rejected'

    // Find a system actor (first admin) for transitions
    const { data: adminUser } = await (adminSb as any)
      .from('profiles').select('id, full_name, email').eq('role', 'admin').limit(1).single()
    const { data: superAdmin } = await (adminSb as any)
      .from('profiles').select('id, full_name, email').eq('role', 'super_admin').limit(1).single()
    const actorProfile = adminUser ?? superAdmin
    const actorId = actorProfile?.id ?? entityId  // fallback

    // ── Requirement ───────────────────────────────────────────────────────────
    if (entityType === 'requirement') {
      await dbTransitionRequirement(entityId!, toStatus, actorId, comment)

      const { data: req } = await (adminSb as any)
        .from('requirements')
        .select('ref_number, title, urgency, requested_by, preferred_vendor_id, currency')
        .eq('id', entityId).single()

      const { data: requester } = req?.requested_by
        ? await (adminSb as any).from('profiles').select('id, email, full_name').eq('id', req.requested_by).single()
        : { data: null }

      const deciderName = (approval as any).approver?.full_name ?? (approval as any).approver?.email ?? 'Approver'

      const entityRef = req?.ref_number ?? entityId
      const entityTitle = req?.title ?? '—'

      if (requester?.email) {
        const shared = {
          requesterEmail: requester.email,
          requesterName: requester.full_name ?? requester.email,
          ref: entityRef,
          title: entityTitle,
          approverName: deciderName,
          requirementId: entityId!,
        }

        if (decision === 'approve') {
          await sendRequirementApproved({ ...shared, comment })

          // Auto-create PO from requirement
          let autoPO: any = null
          try {
            autoPO = await dbAutoCreatePOFromRequirement(entityId!, actorId, req?.preferred_vendor_id ?? null)

            // Transition requirement to in_progress
            await dbTransitionRequirement(entityId!, 'in_progress', actorId)

            // Find PO approver
            const { data: poApprovers } = await (adminSb as any)
              .from('profiles').select('id, role, email, full_name')
              .in('role', ['approver', 'procurement_manager', 'admin', 'super_admin'])
            const PO_APPROVER_PRIORITY = ['approver', 'procurement_manager', 'admin', 'super_admin'] as const
            let poApprover: any = null
            for (const r of PO_APPROVER_PRIORITY) {
              poApprover = (poApprovers ?? []).find((p: any) => p.role === r)
              if (poApprover) break
            }

            if (poApprover) {
              const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 3)
              const dueDateStr = dueDate.toISOString().split('T')[0]
              const newApproval = await dbCreateApproval('purchase_order', autoPO.id, poApprover.id, 1, dueDateStr)
              const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

              if (poApprover.email) {
                await sendPOPendingApproval({
                  approverEmail: poApprover.email,
                  approverName: poApprover.full_name ?? poApprover.email,
                  ref: autoPO.po_number ?? autoPO.id,
                  vendorName: req?.preferred_vendor_id ? 'Preferred vendor (TBD)' : 'TBD — to be set by procurement',
                  totalAmount: `${req?.currency ?? 'USD'} ${(autoPO.total_amount ?? 0).toLocaleString()}`,
                  createdByName: deciderName,
                  dueDate: dueDateStr,
                  poId: autoPO.id,
                  approvalToken: (newApproval as any).approval_token,
                  appUrl,
                })
              }
            }
          } catch (poErr: any) {
            console.error('[approveByToken] Auto-PO creation failed:', poErr.message)
          }

          // Notify accounts team
          const accountsEmails = await getAccountsEmails()
          if (accountsEmails.length > 0) {
            await sendRequirementApprovedToAccounts({
              accountsEmails,
              ref: entityRef,
              title: entityTitle,
              approverName: deciderName,
              requesterName: requester.full_name ?? requester.email,
              urgency: req?.urgency ?? 'routine',
              requirementId: entityId!,
              comment,
              ...(autoPO ? { poId: autoPO.id, poNumber: autoPO.po_number } : {}),
            })
          }

          if (autoPO) {
            revalidatePath('/procurement/purchase-orders')
            revalidatePath(`/procurement/purchase-orders/${autoPO.id}`)
          }
        } else {
          await sendRequirementRejected({ ...shared, reason: comment })
        }
      }

      revalidatePath('/requirements')
      revalidatePath(`/requirements/${entityId}`)
      revalidatePath('/approvals')
      return { ok: true, decision, entityType: 'requirement', entityRef, entityTitle }
    }

    // ── Purchase Order ────────────────────────────────────────────────────────
    if (entityType === 'purchase_order') {
      await dbTransitionPurchaseOrder(entityId!, toStatus, actorId, comment)

      const { data: po } = await (adminSb as any)
        .from('purchase_orders')
        .select('po_number, created_by, total_amount, currency, vendor_id, requirement_id, delivery_address, expected_delivery, notes')
        .eq('id', entityId).single()

      const entityRef = po?.po_number ?? entityId
      const deciderName = (approval as any).approver?.full_name ?? (approval as any).approver?.email ?? 'Approver'

      if (decision === 'approve' && po) {
        const { data: creator } = po.created_by
          ? await (adminSb as any).from('profiles').select('email, full_name').eq('id', po.created_by).single()
          : { data: null }
        const { data: vendor } = po.vendor_id
          ? await (adminSb as any).from('vendors').select('name, email').eq('id', po.vendor_id).single()
          : { data: null }

        // Email procurement officer
        if (creator?.email) {
          await sendPOApproved({
            procurementEmail: creator.email,
            procurementName: creator.full_name ?? creator.email,
            ref: po.po_number ?? entityId,
            vendorName: vendor?.name ?? 'TBD',
            totalAmount: `${po.currency ?? 'USD'} ${(po.total_amount ?? 0).toLocaleString()}`,
            poId: entityId!,
          })
        }

        // Auto-transition to ordered
        await dbTransitionPurchaseOrder(entityId!, 'ordered', actorId)

        // Email vendor
        if (vendor?.email) {
          const { data: poItems } = await (adminSb as any)
            .from('po_items').select('description, quantity, unit, unit_price, currency').eq('po_id', entityId)
          const companyName = await getSystemSetting('company_name')
          await sendPOToVendor({
            vendorEmail: vendor.email,
            vendorName: vendor.name,
            ref: po.po_number ?? entityId!,
            items: (poItems ?? []) as any,
            totalAmount: `${po.currency ?? 'USD'} ${(po.total_amount ?? 0).toLocaleString()}`,
            currency: po.currency ?? 'USD',
            expectedDelivery: po.expected_delivery ?? undefined,
            deliveryAddress: po.delivery_address ?? undefined,
            notes: po.notes ?? undefined,
            companyName: companyName || 'SMLS',
          })
        }

        // Notify accounts team
        const accountsEmails = await getAccountsEmails()
        if (accountsEmails.length > 0) {
          let requesterName = 'Unknown'
          if (po.requirement_id) {
            const { data: reqRow } = await (adminSb as any)
              .from('requirements').select('requested_by').eq('id', po.requirement_id).single()
            if (reqRow) {
              const { data: rp } = await (adminSb as any)
                .from('profiles').select('full_name, email').eq('id', reqRow.requested_by).single()
              if (rp) requesterName = rp.full_name ?? rp.email
            }
          }
          await sendPOApprovedToAccounts({
            accountsEmails,
            ref: po.po_number ?? entityId!,
            vendorName: vendor?.name ?? 'TBD',
            totalAmount: (po.total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
            currency: po.currency ?? 'USD',
            approverName: deciderName,
            requesterName,
            poId: entityId!,
          })
        }

        // Auto-create delivery record
        const { data: poItemsForDelivery } = await (adminSb as any)
          .from('po_items').select('id, line_number, description, part_number, quantity, unit').eq('po_id', entityId)
        if (poItemsForDelivery?.length > 0) {
          await dbCreateDelivery({
            po_id: entityId!,
            delivery_ref: `DLV-${Date.now()}`,
            expected_date: po.expected_delivery ?? null,
            notes: `Auto-created when PO ${po.po_number ?? entityId} was approved.`,
            items: poItemsForDelivery.map((item: any, idx: number) => ({
              po_item_id: item.id,
              line_number: item.line_number ?? idx + 1,
              description: item.description,
              part_number: item.part_number ?? undefined,
              quantity_expected: item.quantity,
              quantity_received: 0,
              unit: item.unit,
            })),
          }, actorId)
        }

        revalidatePath('/procurement/deliveries')
      }

      revalidatePath('/procurement/purchase-orders')
      revalidatePath(`/procurement/purchase-orders/${entityId}`)
      revalidatePath('/approvals')
      return { ok: true, decision, entityType: 'purchase_order', entityRef, entityTitle: `Purchase Order ${entityRef}` }
    }

    return { ok: true, decision, entityType: entityType ?? 'unknown' }
  } catch (e: any) {
    console.error('[approveByToken] Error:', e.message || e)
    return { ok: false, error: e.message ?? 'Something went wrong. Please try again.' }
  }
}

/** Load approval details by token (for showing the confirmation page) */
export async function getApprovalDetailsByToken(token: string): Promise<{
  found: boolean
  alreadyDecided: boolean
  entityType?: string
  entityRef?: string
  entityTitle?: string
  entityAmount?: string
  entityCurrency?: string
  entityUrgency?: string
  requesterName?: string
  status?: string
} | null> {
  try {
    const adminSb = createAdminClient()
    const approval = await dbGetApprovalByToken(token)
    if (!approval) return null

    const entityType = (approval as any).entity_type
    const entityId = (approval as any).entity_id
    const alreadyDecided = !!(approval as any).token_used_at || (approval as any).status !== 'pending_approval'

    if (entityType === 'requirement') {
      const { data: req } = await (adminSb as any)
        .from('requirements')
        .select('ref_number, title, urgency, budget_estimate, currency, requested_by')
        .eq('id', entityId).single()
      const { data: requester } = req?.requested_by
        ? await (adminSb as any).from('profiles').select('full_name, email').eq('id', req.requested_by).single()
        : { data: null }

      return {
        found: true,
        alreadyDecided,
        entityType,
        entityRef: req?.ref_number ?? entityId,
        entityTitle: req?.title ?? '—',
        entityAmount: req?.budget_estimate ? `${req.currency ?? 'USD'} ${Number(req.budget_estimate).toLocaleString()}` : undefined,
        entityCurrency: req?.currency,
        entityUrgency: req?.urgency,
        requesterName: requester?.full_name ?? requester?.email ?? '—',
        status: (approval as any).status,
      }
    }

    if (entityType === 'purchase_order') {
      const { data: po } = await (adminSb as any)
        .from('purchase_orders')
        .select('po_number, total_amount, currency, vendor_id, requirement_id')
        .eq('id', entityId).single()
      const { data: vendor } = po?.vendor_id
        ? await (adminSb as any).from('vendors').select('name').eq('id', po.vendor_id).single()
        : { data: null }

      return {
        found: true,
        alreadyDecided,
        entityType,
        entityRef: po?.po_number ?? entityId,
        entityTitle: vendor?.name ? `Purchase Order — ${vendor.name}` : 'Purchase Order',
        entityAmount: po?.total_amount != null ? `${po.currency ?? 'USD'} ${Number(po.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : undefined,
        entityCurrency: po?.currency,
        status: (approval as any).status,
      }
    }

    return { found: true, alreadyDecided, entityType, entityRef: entityId, entityTitle: entityType ?? '—', status: (approval as any).status }
  } catch {
    return null
  }
}
