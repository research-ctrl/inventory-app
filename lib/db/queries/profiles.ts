import { createClient } from '@/lib/supabase/server'

export type ProfileRow = {
  id: string
  full_name: string
  email: string
  role: string | null
  department: string | null
}

/**
 * All active profiles ordered by full_name
 */
export async function getProfiles(): Promise<ProfileRow[]> {
  const sb = await createClient()

  const { data, error } = await sb
    .from('profiles')
    .select('id, full_name, email, role, department')
    .order('full_name', { ascending: true })

  if (error) throw new Error(`getProfiles: ${error.message}`)
  return (data ?? []) as unknown as ProfileRow[]
}

/**
 * Single profile by id
 */
export async function getProfileById(id: string): Promise<ProfileRow | null> {
  const sb = await createClient()

  const { data, error } = await sb
    .from('profiles')
    .select('id, full_name, email, role, department')
    .eq('id', id)
    .single()

  if (error) throw new Error(`getProfileById: ${error.message}`)
  return data as unknown as ProfileRow
}

/**
 * Profiles filtered by role
 */
export async function getProfilesByRole(role: string): Promise<ProfileRow[]> {
  const sb = await createClient()

  const { data, error } = await sb
    .from('profiles')
    .select('id, full_name, email, role, department')
    .eq('role', role)
    .order('full_name', { ascending: true })

  if (error) throw new Error(`getProfilesByRole: ${error.message}`)
  return (data ?? []) as unknown as ProfileRow[]
}
