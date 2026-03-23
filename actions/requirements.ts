'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'
import { can } from '@/lib/permissions/checks'
import { CreateRequirementSchema, UpdateRequirementSchema } from '@/lib/validations/requirement'
import { dbCreateRequirement, dbTransitionRequirement, dbUpdateRequirement } from '@/lib/db/mutations/requirements'
import { dbCreateApproval } from '@/lib/db/mutations/approvals'
import { canTransition } from '@/lib/workflow/transitions'
import type { CreateRequirementInput } from '@/lib/validations/requirement'
import { sendRequirementPendingApproval, sendRequirementCancelled, sendRequirementCreatedProcurement } from '@/lib/email/send'

/** Roles that can act as approvers, in priority order */
const APPROVER_ROLES = ['approver', 'procurement_manager', 'admin', 'super_admin'] as const

/** Find the best available approver in the system */
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

/** Roles allowed to change urgency inline */
const URGENCY_EDIT_ROLES = [
  'super_admin', 'admin', 'procurement_manager', 'procurement_officer',
  'engineer', 'store_manager',
] as const

export async function createRequirement(formData: CreateRequirementInput) {
  try {
    const { profile, role, user } = await getServerSession()
    if (!can(role, 'requirement', 'create')) return { success: false, error: 'Insufficient permissions' }
    const parsed = CreateRequirementSchema.safeParse(formData)
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors }
    const data = await dbCreateRequirement(parsed.data, profile.id)
    revalidatePath('/requirements')

    // Notify all procurement managers about the new requirement (fire-and-forget)
    notifyProcurementManagers(data, profile.full_name ?? user.email, parsed.data).catch(() => {})

    return { success: true, data }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/** Fire-and-forget: email all procurement_managers about a new requirement */
async function notifyProcurementManagers(
  req: any,
  requesterName: string,
  input: CreateRequirementInput
): Promise<void> {
  try {
    const sb = await createClient()

    // Fetch preferred vendor name if set
    let preferredVendorName: string | undefined
    if (input.preferred_vendor_id) {
      const { data: vend } = await sb
        .from('vendors')
        .select('name')
        .eq('id', input.preferred_vendor_id)
        .single()
      preferredVendorName = (vend as any)?.name
    }

    // Fetch all procurement managers
    const { data: managers } = await sb
      .from('profiles')
      .select('email, full_name')
      .eq('role', 'procurement_manager')
    if (!managers?.length) return

    const promises = managers.map((mgr: any) =>
      sendRequirementCreatedProcurement({
        managerEmail:    mgr.email,
        managerName:     mgr.full_name ?? mgr.email,
        ref:             req.ref_number ?? req.id,
        title:           req.title,
        requesterName,
        urgency:         input.urgency ?? 'routine',
        preferredVendor: preferredVendorName,
        reason:          input.reason ?? undefined,
        requirementId:   req.id,
      })
    )
    await Promise.allSettled(promises)
  } catch {
    // Non-fatal
  }
}

export async function updateRequirement(id: string, formData: Partial<CreateRequirementInput>) {
  try {
    const { role } = await getServerSession()
    if (!can(role, 'requirement', 'update')) return { success: false, error: 'Insufficient permissions' }
    const data = await dbUpdateRequirement(id, formData)
    revalidatePath('/requirements')
    revalidatePath(`/requirements/${id}`)
    return { success: true, data }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateRequirementUrgency(id: string, urgency: 'routine' | 'urgent' | 'critical') {
  try {
    const { role } = await getServerSession()
    if (!(URGENCY_EDIT_ROLES as readonly string[]).includes(role)) {
      return { success: false, error: 'Insufficient permissions to change urgency' }
    }
    const sb = await createClient()
    const { error } = await sb.from('requirements').update({ urgency } as any).eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/requirements')
    revalidatePath(`/requirements/${id}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function transitionRequirement(id: string, toStatus: string, comment?: string) {
  try {
    const { profile, role, user } = await getServerSession()
    const sb = await createClient()
    const { data: req } = await sb.from('requirements').select('status, requested_by, ref_number, title, urgency, assigned_approver_id').eq('id', id).single()
    if (!canTransition('requirement', req?.status ?? null, toStatus, role as any)) {
      return { success: false, error: 'Transition not allowed for your role' }
    }
    await dbTransitionRequirement(id, toStatus, profile.id, comment)

    // When cancelled → notify original requester
    if (toStatus === 'cancelled' && req) {
      const requestedBy = (req as any).requested_by
      if (requestedBy) {
        const { data: requester } = await sb
          .from('profiles')
          .select('email, full_name')
          .eq('id', requestedBy)
          .single()
        if (requester?.email) {
          await sendRequirementCancelled({
            requesterEmail:  requester.email,
            requesterName:   requester.full_name ?? requester.email,
            ref:             (req as any).ref_number ?? id,
            title:           (req as any).title ?? 'Requirement',
            cancelledByName: profile.full_name ?? user.email,
            reason:          comment,
            requirementId:   id,
          })
        }
      }
    }

    // When submitted for approval → create an approval record + notify approver
    if (toStatus === 'pending_approval' && req) {
      // Use assigned approver if present, otherwise find one by role
      let approverId = (req as any).assigned_approver_id
      if (!approverId) {
        approverId = await findApprover(sb)
      }

      if (approverId) {
        const due = new Date()
        due.setDate(due.getDate() + 3)
        const dueDateStr = due.toISOString().split('T')[0]
        const newApproval = await dbCreateApproval('requirement', id, approverId, 1, dueDateStr)

        // Fetch approver details for email
        const { data: approver } = await sb
          .from('profiles')
          .select('email, full_name')
          .eq('id', approverId)
          .single()

        if (approver?.email) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
          await sendRequirementPendingApproval({
            approverEmail:   approver.email,
            approverName:    approver.full_name ?? approver.email,
            ref:             (req as any).ref_number ?? id,
            title:           (req as any).title,
            requesterName:   profile.full_name ?? user.email,
            urgency:         (req as any).urgency ?? 'routine',
            dueDate:         dueDateStr,
            requirementId:   id,
            approvalToken:   (newApproval as any).approval_token,
            appUrl,
          })
        }
      }
    }

    revalidatePath('/requirements')
    revalidatePath(`/requirements/${id}`)
    revalidatePath('/approvals')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
