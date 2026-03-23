'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/auth/roles'

const PAGE_SIZE = 20

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
 * Invite a new user by email. Sends a Supabase magic-link / invite email.
 * The user's profile is pre-created with the intended role so it takes effect on first sign-in.
 */
export async function inviteUser(email: string, role: Role, fullName?: string) {
  try {
    await requireAdminOrBootstrap()
    const adminSb = createAdminClient()
    const cleanEmail = email.toLowerCase().trim()

    // Check if user already exists
    const { data: existing } = await adminSb
      .from('profiles')
      .select('id, email')
      .eq('email', cleanEmail)
      .single() as any

    if (existing) {
      return { success: false, error: `A user with email ${cleanEmail} already exists. Use "Grant Role" to update their role.` }
    }

    // Invite via Supabase Auth (sends an invite/magic-link email)
    const { data: inviteData, error: inviteError } = await adminSb.auth.admin.inviteUserByEmail(cleanEmail, {
      data: {
        full_name: fullName ?? cleanEmail.split('@')[0],
        intended_role: role,
      },
    })

    if (inviteError) throw new Error(inviteError.message)

    // Pre-create profile with intended role so it's ready when they sign in
    if (inviteData?.user) {
      await adminSb.from('profiles').upsert({
        id: inviteData.user.id,
        email: cleanEmail,
        full_name: fullName ?? cleanEmail.split('@')[0],
        role,
      } as any)
    }

    revalidatePath('/admin')
    revalidatePath('/admin-portal')
    return { success: true, message: `Invitation sent to ${cleanEmail} with role '${role}'.` }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/**
 * Grant a role to a user by email address.
 * Accessible by admins or in bootstrap mode (0 admins exist).
 */
export async function grantRoleByEmail(email: string, role: Role) {
  try {
    await requireAdminOrBootstrap()
    const sb = createAdminClient()

    // Find profile by email
    const { data: profile, error: findErr } = await (sb
      .from('profiles')
      .select('id, email, role')
      .eq('email', email.toLowerCase().trim())
      .single() as any)

    if (findErr || !profile) {
      return { success: false, error: `No user found with email: ${email}. They may need to sign up first.` }
    }

    const { error } = await sb
      .from('profiles')
      .update({ role } as any)
      .eq('id', profile.id)

    if (error) throw new Error(error.message)

    revalidatePath('/admin')
    return { success: true, message: `${email} has been granted the '${role}' role.` }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/**
 * Permanently delete a user (auth + profile via cascade).
 * Super admins can delete anyone; admins cannot delete other admins.
 */
export async function deleteUser(targetUserId: string) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) throw new Error('Unauthenticated')
    if (user.id === targetUserId) throw new Error('You cannot delete your own account.')

    const adminSb = createAdminClient()

    const { data: actor }  = await adminSb.from('profiles').select('role').eq('id', user.id).single()
    const { data: target } = await adminSb.from('profiles').select('role').eq('id', targetUserId).single()

    if (!['super_admin', 'admin'].includes(actor?.role ?? '')) {
      throw new Error('Insufficient permissions.')
    }
    if (actor?.role === 'admin' && ['admin', 'super_admin'].includes(target?.role ?? '')) {
      throw new Error('Admins cannot delete other admin accounts. Only super admins can.')
    }

    const { error } = await adminSb.auth.admin.deleteUser(targetUserId)
    if (error) throw new Error(error.message)

    revalidatePath('/admin')
    revalidatePath('/admin-portal')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/**
 * Paginated activity for a specific user:
 *  - workflow_history entries where actor_id = userId
 *  - pending approvals assigned to userId
 */
export async function getUserActivity(
  targetUserId: string,
  tab: 'history' | 'pending',
  page: number = 1
) {
  try {
    await requireAdminOrBootstrap()
    const adminSb = createAdminClient()
    const from = (page - 1) * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1

    if (tab === 'history') {
      const { data, count, error } = await (adminSb
        .from('workflow_history')
        .select(`
          id, entity_type, entity_id, from_status, to_status, event, comment, created_at,
          actor:profiles!actor_id(full_name, email)
        `, { count: 'exact' })
        .eq('actor_id', targetUserId)
        .order('created_at', { ascending: false })
        .range(from, to) as any)

      if (error) throw new Error(error.message)
      return { success: true, data: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE }
    }

    // tab === 'pending': approvals assigned to this user that are still pending
    const { data, count, error } = await (adminSb
      .from('approvals')
      .select(`
        id, entity_type, entity_id, status, due_date, created_at, comment,
        requirement:requirements!entity_id(ref_number, title, status)
      `, { count: 'exact' })
      .eq('approver_id', targetUserId)
      .eq('status', 'pending_approval')
      .order('due_date', { ascending: true })
      .range(from, to) as any)

    if (error) throw new Error(error.message)
    return { success: true, data: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE }
  } catch (e: any) {
    return { success: false, error: e.message, data: [], total: 0, page, pageSize: PAGE_SIZE }
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
