'use server'

import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import type { Role } from './roles'

export interface Session {
  user: User
  role: Role
}

export type ServerSession = {
  user: { id: string; email: string }
  profile: { id: string; role: Role; full_name: string | null }
  role: Role
}

/**
 * Retrieves the current authenticated session with profile and role from DB.
 * Throws if unauthenticated.
 * Use this in server actions for full profile access.
 */
export async function getServerSession(): Promise<ServerSession> {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user) throw new Error('Unauthenticated')

  // Fetch profile — use 'as any' to bypass Supabase partial-select type inference
  const { data } = (await sb
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .single()) as { data: { id: string; role: Role; full_name: string | null } | null; error: any }

  const role: Role = data?.role ?? 'viewer'

  return {
    user: { id: user.id, email: user.email ?? '' },
    profile: {
      id: data?.id ?? user.id,
      role,
      full_name: data?.full_name ?? null,
    },
    role,
  }
}

/** Legacy helper — resolves role from user metadata (fallback). */
export async function getSession(): Promise<Session | null> {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return null
  const role = (user.user_metadata?.role ?? 'viewer') as Role
  return { user, role }
}

export async function requireSession(): Promise<Session> {
  const session = await getSession()
  if (!session) throw new Error('Unauthenticated')
  return session
}
