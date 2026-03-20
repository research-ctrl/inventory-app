'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'
import { can } from '@/lib/permissions/checks'
import { CreateRequirementSchema, UpdateRequirementSchema } from '@/lib/validations/requirement'
import { dbCreateRequirement, dbTransitionRequirement, dbUpdateRequirement } from '@/lib/db/mutations/requirements'
import { canTransition } from '@/lib/workflow/transitions'
import type { CreateRequirementInput } from '@/lib/validations/requirement'

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

export async function transitionRequirement(id: string, toStatus: string, comment?: string) {
  try {
    const { profile, role } = await getServerSession()
    const sb = await createClient()
    const { data: req } = await sb.from('requirements').select('status').eq('id', id).single()
    if (!canTransition('requirement', req?.status ?? null, toStatus, role as any)) {
      return { success: false, error: 'Transition not allowed for your role' }
    }
    await dbTransitionRequirement(id, toStatus, profile.id, comment)
    revalidatePath('/requirements')
    revalidatePath(`/requirements/${id}`)
    revalidatePath('/approvals')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
