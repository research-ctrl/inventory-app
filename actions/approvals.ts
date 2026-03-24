'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerSession } from '@/lib/auth/session'
import { can } from '@/lib/permissions/checks'
import { dbDecideApproval, dbCreateApproval } from '@/lib/db/mutations/approvals'
import { dbTransitionRequirement } from '@/lib/db/mutations/requirements'
import { dbTransitionPurchaseOrder } from '@/lib/db/mutations/purchase-orders'
import { dbCreateDelivery } from '@/lib/db/mutations/deliveries'
import { sendRequirementApproved, sendRequirementRejected, sendPOApproved, sendPOApprovedToAccounts, sendPOToVendor } from '@/lib/email/send'
import { createNotification } from '@/actions/notifications'
import { getSystemSetting } from '@/actions/settings'

/** Get accounts emails: first try system_settings table, then fall back to env var */
async function getAccountsEmails(): Promise<string[]> {
  // Env var fallback (e.g. ACCOUNTS_EMAILS=finance@co.com,accounts@co.com)
  const envEmails = (process.env.ACCOUNTS_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)

  try {
    const adminSb = createAdminClient()
    const { data } = await (adminSb as any)
      .from('system_settings')
      .select('value')
      .eq('key', 'accounts_emails')
      .single()

    if (data?.value) {
      const dbEmails = data.value
        .split(',')
        .map((e: string) => e.trim())
        .filter(Boolean)
      if (dbEmails.length) return dbEmails
    }
  } catch {
    // Table may not exist yet — fall through to env var
  }

  return envEmails
}

export async function decideApproval(
  approvalId: string,
  decision: 'approve' | 'reject',
  comment?: string,
  /** Subset of accounts emails the approver chose to notify (from the dialog). */
  selectedAccountsEmails?: string[],
) {
  try {
    console.log(`[decideApproval] Started: approvalId=${approvalId}, decision=${decision}, selectedAccountsEmails=${JSON.stringify(selectedAccountsEmails)}`);

    const { profile, role, user } = await getServerSession()
    console.log(`[decideApproval] User: ${user.email}, role=${role}, profile.id=${profile.id}`);

    if (!can(role, 'approval', 'approve')) {
      console.log(`[decideApproval] Permission denied: role=${role}`);
      return { success: false, error: 'Insufficient permissions' }
    }

    const sb = await createClient()
    const { data: approval } = await sb.from('approvals').select('*').eq('id', approvalId).single()
    if (!approval) {
      console.log(`[decideApproval] Approval not found: ${approvalId}`);
      return { success: false, error: 'Approval not found' }
    }
    console.log(`[decideApproval] Approval loaded: entity_type=${approval.entity_type}, entity_id=${approval.entity_id}`);

    await dbDecideApproval(approvalId, decision, comment)

    const toStatus = decision === 'approve' ? 'approved' : 'rejected'

    // ── Requirement approval ──────────────────────────────────────────────────
    if (approval.entity_type === 'requirement') {
      await dbTransitionRequirement(approval.entity_id, toStatus, profile.id, comment)

      const { data: req } = await sb
        .from('requirements')
        .select('ref_number, title, urgency, requested_by, preferred_vendor_id, currency')
        .eq('id', approval.entity_id)
        .single()

      if (req) {
        const { data: requester } = await sb
          .from('profiles').select('id, email, full_name').eq('id', (req as any).requested_by).single()

        const approverName = profile.full_name ?? user.email

        if (requester?.email) {
          const shared = {
            requesterEmail: requester.email,
            requesterName:  (requester as any).full_name ?? requester.email,
            ref:            (req as any).ref_number ?? approval.entity_id,
            title:          (req as any).title,
            approverName,
            requirementId:  approval.entity_id,
          }

          if (decision === 'approve') {
            // Email requester
            await sendRequirementApproved({ ...shared, comment })

            // In-app notification to requester
            await createNotification({
              recipientId: (req as any).requested_by,
              entityType:  'requirement',
              entityId:    approval.entity_id,
              title:       `Requirement ${(req as any).ref_number ?? ''} approved`,
              body:        `Approved by ${approverName}. Procurement will now create a Purchase Order.`,
            })

          } else {
            await sendRequirementRejected({ ...shared, reason: comment })
            await createNotification({
              recipientId: (req as any).requested_by,
              entityType:  'requirement',
              entityId:    approval.entity_id,
              title:       `Requirement ${(req as any).ref_number ?? ''} was rejected`,
              body:        comment ? `Reason: ${comment}` : `Rejected by ${approverName}. Please revise and resubmit.`,
            })
          }
        }
      }
    // ── Purchase Order approval ───────────────────────────────────────────────
    } else if (approval.entity_type === 'purchase_order') {
      console.log(`[decideApproval] PO approval flow starting...`);
      await dbTransitionPurchaseOrder(approval.entity_id, toStatus, profile.id, comment)

      if (decision === 'approve') {
        console.log(`[decideApproval] Fetching PO details for ${approval.entity_id}`);
        const { data: po } = await sb
          .from('purchase_orders')
          .select('po_number, created_by, total_amount, currency, vendor_id, requirement_id')
          .eq('id', approval.entity_id)
          .single()

        if (po) {
          console.log(`[decideApproval] PO found: po_number=${(po as any).po_number}, amount=${(po as any).total_amount}`);
          const { data: creator } = await sb
            .from('profiles').select('email, full_name').eq('id', (po as any).created_by).single()
          const { data: vendor } = (po as any).vendor_id
            ? await sb.from('vendors').select('name').eq('id', (po as any).vendor_id).single()
            : { data: null }

          if (creator?.email) {
            console.log(`[decideApproval] Sending PO approval email to procurement: ${creator.email}`);
            await sendPOApproved({
              procurementEmail: creator.email,
              procurementName:  (creator as any).full_name ?? creator.email,
              ref:              (po as any).po_number ?? approval.entity_id,
              vendorName:       (vendor as any)?.name ?? 'TBD',
              totalAmount:      `${(po as any).currency ?? 'USD'} ${((po as any).total_amount ?? 0).toLocaleString()}`,
              poId:             approval.entity_id,
            })
            console.log(`[decideApproval] PO approval email sent`);
          }

          // Notify accounts team
          console.log(`[decideApproval] Fetching accounts emails for PO approval`);
          const allAccountsEmails = await getAccountsEmails()
          const emailsToNotify = (selectedAccountsEmails && selectedAccountsEmails.length > 0)
            ? selectedAccountsEmails
            : allAccountsEmails

          console.log(`[decideApproval] PO accounts emails to notify: ${JSON.stringify(emailsToNotify)}`);

          if (emailsToNotify.length > 0) {
            let requesterNameForAccounts = 'Unknown'
            if ((po as any).requirement_id) {
              const { data: reqRow } = await sb
                .from('requirements').select('requested_by').eq('id', (po as any).requirement_id).single()
              if (reqRow) {
                const { data: rp } = await sb
                  .from('profiles').select('full_name, email').eq('id', (reqRow as any).requested_by).single()
                if (rp) requesterNameForAccounts = (rp as any).full_name ?? (rp as any).email
              }
            }
            console.log(`[decideApproval] Sending PO approval to ${emailsToNotify.length} accounts`);
            await sendPOApprovedToAccounts({
              accountsEmails: emailsToNotify,
              ref:            (po as any).po_number ?? approval.entity_id,
              vendorName:     (vendor as any)?.name ?? 'TBD',
              totalAmount:    ((po as any).total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
              currency:       (po as any).currency ?? 'USD',
              approverName:   profile.full_name ?? user.email,
              requesterName:  requesterNameForAccounts,
              poId:           approval.entity_id,
            })
            console.log(`[decideApproval] PO accounts approval email sent`);
          }

          // ── Auto-transition to ordered + email vendor + create delivery ──────
          console.log(`[decideApproval] Auto-transitioning PO to ordered...`);
          try {
            await dbTransitionPurchaseOrder(approval.entity_id, 'ordered', profile.id)
            console.log(`[decideApproval] PO transitioned to ordered`);

            // Get full PO details for vendor email + delivery creation
            const { data: fullPo } = await sb
              .from('purchase_orders')
              .select('po_number, total_amount, currency, vendor_id, delivery_address, expected_delivery, notes')
              .eq('id', approval.entity_id).single()

            const { data: vendorFull } = (po as any).vendor_id
              ? await sb.from('vendors').select('name, email').eq('id', (po as any).vendor_id).single()
              : { data: null }

            // Email vendor if they have an email address
            if ((vendorFull as any)?.email && fullPo) {
              console.log(`[decideApproval] Sending PO to vendor: ${(vendorFull as any).email}`);
              const { data: poItems } = await sb.from('po_items')
                .select('description, quantity, unit, unit_price, currency').eq('po_id', approval.entity_id)
              const companyName = await getSystemSetting('company_name')
              await sendPOToVendor({
                vendorEmail:      (vendorFull as any).email,
                vendorName:       (vendorFull as any).name,
                ref:              (fullPo as any).po_number ?? approval.entity_id,
                items:            (poItems ?? []) as any,
                totalAmount:      `${(fullPo as any).currency ?? 'USD'} ${((fullPo as any).total_amount ?? 0).toLocaleString()}`,
                currency:         (fullPo as any).currency ?? 'USD',
                expectedDelivery: (fullPo as any).expected_delivery ?? undefined,
                deliveryAddress:  (fullPo as any).delivery_address ?? undefined,
                notes:            (fullPo as any).notes ?? undefined,
                companyName:      companyName || 'SMLS',
              })
              console.log(`[decideApproval] Vendor email sent`);
            } else {
              console.log(`[decideApproval] Vendor has no email, skipping vendor notification`);
            }

            // Auto-create draft delivery record for this PO
            console.log(`[decideApproval] Auto-creating delivery record for PO ${approval.entity_id}`);
            const { data: poItemsForDelivery } = await sb.from('po_items')
              .select('id, line_number, description, part_number, quantity, unit').eq('po_id', approval.entity_id)

            if (poItemsForDelivery && poItemsForDelivery.length > 0) {
              const deliveryRef = `DLV-${Date.now()}`
              await dbCreateDelivery({
                po_id:         approval.entity_id,
                delivery_ref:  deliveryRef,
                expected_date: (fullPo as any)?.expected_delivery ?? null,
                notes:         `Auto-created when PO ${(po as any).po_number ?? approval.entity_id} was approved and placed with vendor.`,
                items: poItemsForDelivery.map((item: any, idx: number) => ({
                  po_item_id:        item.id,
                  line_number:       item.line_number ?? idx + 1,
                  description:       item.description,
                  part_number:       item.part_number ?? undefined,
                  quantity_expected: item.quantity,
                  quantity_received: 0,
                  unit:              item.unit,
                })),
              }, profile.id)
              console.log(`[decideApproval] Delivery ${deliveryRef} auto-created`);
              revalidatePath('/procurement/deliveries')
            } else {
              console.log(`[decideApproval] No PO items found — delivery not auto-created`);
            }
          } catch (autoOrderErr: any) {
            console.error(`[decideApproval] Auto-order/delivery creation failed:`, autoOrderErr.message || autoOrderErr)
            // Non-fatal — PO approval still stands
          }

        } else {
          console.log(`[decideApproval] PO not found: ${approval.entity_id}`);
        }
      }
    }

    revalidatePath('/approvals')
    revalidatePath(`/approvals/${approvalId}`)
    revalidatePath('/requirements')
    revalidatePath('/procurement/purchase-orders')
    revalidatePath('/procurement/deliveries')
    console.log(`[decideApproval] Completed successfully`);
    return { success: true }
  } catch (e: any) {
    console.error(`[decideApproval] FAILED with error:`, e.message || e);
    return { success: false, error: e.message }
  }
}
