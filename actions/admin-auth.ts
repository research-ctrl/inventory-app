'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** Sign in and redirect to the admin portal. */
export async function adminPortalSignIn(formData: FormData) {
  const email    = formData.get('email')?.toString()
  const password = formData.get('password')?.toString()

  if (!email || !password) return { error: 'Email and password are required.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }

  redirect('/admin-portal')
}

/** Bootstrap sign-up: only works when zero admins exist.
 *  Creates the user (email-confirmed) + immediately sets them as super_admin.
 */
export async function adminPortalBootstrapSignUp(formData: FormData) {
  const email     = formData.get('email')?.toString()?.toLowerCase().trim()
  const password  = formData.get('password')?.toString()
  const fullName  = formData.get('full_name')?.toString()?.trim() || null

  if (!email || !password) return { error: 'Email and password are required.' }
  if (password.length < 8)  return { error: 'Password must be at least 8 characters.' }

  const adminSb = createAdminClient()

  // Only allow when no admins exist
  const { count } = await adminSb
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .in('role', ['super_admin', 'admin'])

  if ((count ?? 0) > 0) {
    return { error: 'Bootstrap is locked — admins already exist. Contact your super admin.' }
  }

  // Create user via admin API so email is pre-confirmed
  const { data: createdUser, error: createError } = await adminSb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName ?? email.split('@')[0] },
  })

  if (createError) return { error: createError.message }
  if (!createdUser.user) return { error: 'User creation failed.' }

  // Upsert profile as super_admin (trigger may also fire, but we override the role)
  const { error: profileError } = await adminSb
    .from('profiles')
    .upsert({
      id:        createdUser.user.id,
      email:     createdUser.user.email!,
      full_name: fullName,
      role:      'super_admin',
    })

  if (profileError) return { error: profileError.message }

  // Sign them in immediately
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) {
    return { error: 'Account created! Please sign in at /admin-portal/sign-in' }
  }

  redirect('/admin-portal')
}

/** For a user who is already signed in: claim super_admin in bootstrap mode. */
export async function claimSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not signed in.' }

  const adminSb = createAdminClient()

  const { count } = await adminSb
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .in('role', ['super_admin', 'admin'])

  if ((count ?? 0) > 0) {
    return { success: false, error: 'Bootstrap is locked — admins already exist.' }
  }

  const { error } = await adminSb
    .from('profiles')
    .upsert({
      id:    user.id,
      email: user.email!,
      role:  'super_admin',
    })

  if (error) return { success: false, error: error.message }
  return { success: true }
}
