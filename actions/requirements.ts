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
    const { profile, role } = await getServerSession()
    if (!can(role, 'requirement', 'create')) return { success: false, error: 'Insufficient permissions' }
    const parsed = CreateRequirementSchema.safeParse(formData)
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors }
    const data = await dbCreateRequirement(parsed.data, profile.id)
    revalidatePath('/requirements')
    return { success: true, data }
  } catch (e: any) {
    return { success: false, error: e.message }
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
    const { profile, role } = await getServerSession()
    const sb = await createClient()
    const { data: req } = await sb.from('requirements').select('status').eq('id', id).single()
    if (!canTransition('requirement', req?.status ?? null, toStatus, role as any)) {
      return { success: false, error: 'Transition not allowed for your role' }
    }
    await dbTransitionRequirement(id, toStatus, profile.id, comment)

    // When submitted for approval → create an approval record automatically
    if (toStatus === 'pending_approval') {
      const approverId = await findApprover(sb)
      if (approverId) {
        // Calculate a 3-day due date
        const due = new Date()
        due.setDate(due.getDate() + 3)
        await dbCreateApproval('requirement', id, approverId, 1, due.toISOString().split('T')[0])
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
