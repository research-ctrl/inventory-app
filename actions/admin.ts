'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerSession } from '@/lib/auth/session'
import type { Role } from '@/lib/auth/roles'

/** Only super_admin and admin may call these actions */
async function requireAdminSession() {
  const session = await getServerSession()
  if (!['super_admin', 'admin'].includes(session.role)) {
    throw new Error('Insufficient permissions — admin access required')
  }
  return session
}

/**
 * Update a user's role, full_name, phone_number, and designation.
 * Uses the service-role client so it bypasses RLS.
 */
export async function adminUpdateProfile(
  userId: string,
  updates: {
    full_name?: string
    phone_number?: string
    designation?: string
    role?: Role
  }
) {
  try {
    await requireAdminSession()
    const sb = createAdminClient()

    // Only include defined fields
    const payload: Record<string, string> = {}
    if (updates.full_name !== undefined)   payload.full_name   = updates.full_name
    if (updates.phone_number !== undefined) payload.phone_number = updates.phone_number
    if (updates.designation !== undefined) payload.designation = updates.designation
    if (updates.role !== undefined)        payload.role        = updates.role

    const { error } = await sb
      .from('profiles')
      .update(payload)
      .eq('id', userId)

    if (error) throw new Error(error.message)

    revalidatePath('/admin')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/**
 * List all profiles (admin only).
 * Uses service-role client so RLS doesn't block access.
 */
export async function adminListProfiles() {
  try {
    await requireAdminSession()
    const sb = createAdminClient()

    const { data, error } = await sb
      .from('profiles')
      .select('id, full_name, email, role, department, phone_number, designation')
      .order('full_name', { ascending: true })

    if (error) throw new Error(error.message)
    return { success: true, data: data ?? [] }
  } catch (e: any) {
    return { success: false, error: e.message, data: [] }
  }
}
