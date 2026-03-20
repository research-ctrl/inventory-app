'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'
import { can } from '@/lib/permissions/checks'
import { CreateDeliverySchema } from '@/lib/validations/delivery'
import { dbCreateDelivery, dbTransitionDelivery } from '@/lib/db/mutations/deliveries'
import { canTransition } from '@/lib/workflow/transitions'
import type { CreateDeliveryInput } from '@/lib/validations/delivery'

export async function createDelivery(formData: CreateDeliveryInput) {
  try {
    const { profile, role } = await getServerSession()
    if (!can(role, 'delivery', 'create')) return { success: false, error: 'Insufficient permissions' }
    const parsed = CreateDeliverySchema.safeParse(formData)
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors }
    const data = await dbCreateDelivery(parsed.data, profile.id)
    revalidatePath('/procurement/deliveries')
    revalidatePath('/receiving')
    return { success: true, data }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function transitionDelivery(id: string, toStatus: string, locationId?: string) {
  try {
    const { profile, role } = await getServerSession()
    const sb = await createClient()
    const { data: delivery } = await sb.from('deliveries').select('status').eq('id', id).single()
    if (!canTransition('delivery', delivery?.status ?? null, toStatus, role as any)) {
      return { success: false, error: 'Transition not allowed for your role' }
    }
    await dbTransitionDelivery(id, toStatus, profile.id, locationId)
    revalidatePath('/procurement/deliveries')
    revalidatePath(`/receiving/${id}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
