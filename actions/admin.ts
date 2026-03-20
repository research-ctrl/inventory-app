'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/auth/roles'

/** Check admin access — also allows if no admins exist yet (bootstrap mode) */
async function requireAdminOrBootstrap() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const adminSb = createAdminClient()

  // Check if current user is admin
  const { data: profile } = await adminSb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = ['super_admin', 'admin'].includes(profile?.role ?? '')

  // Count admins in system
  const { count } = await adminSb
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .in('role', ['super_admin', 'admin'])

  const isBootstrap = (count ?? 0) === 0

  if (!isAdmin && !isBootstrap) {
    throw new Error('Insufficient permissions — admin access required')
  }

  return { userId: user.id, isAdmin, isBootstrap }
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
    await requireAdminOrBootstrap()
    const sb = createAdminClient()

    // Build only defined, non-empty fields
    const payload: Record<string, string> = {}
    if (updates.full_name !== undefined)    payload.full_name    = updates.full_name
    if (updates.phone_number !== undefined) payload.phone_number = updates.phone_number
    if (updates.designation !== undefined)  payload.designation  = updates.designation
    if (updates.role !== undefined)         payload.role         = updates.role

    if (Object.keys(payload).length === 0) {
      return { success: true } // nothing to update
    }

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
 * List all profiles (admin or bootstrap only).
 */
export async function adminListProfiles() {
  try {
    await requireAdminOrBootstrap()
    const sb = createAdminClient()

    const { data, error } = await (sb
      .from('profiles')
      .select('id, full_name, email, role, department, phone_number, designation')
      .order('full_name', { ascending: true }) as any)

    if (error) throw new Error(error.message)
    return { success: true, data: data ?? [] }
  } catch (e: any) {
    return { success: false, error: e.message, data: [] }
  }
}
