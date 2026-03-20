'use server'

import { createClient } from '@/lib/supabase/server'
import type { Role } from './roles'

export interface Session {
  user: { id: string; email: string }
  role: Role
}

export type ServerSession = {
  user: { id: string; email: string }
  profile: { id: string; role: Role; full_name: string | null }
  role: Role
}

const PROTOTYPE_FALLBACK_USER = {
  id: 'prototype-operator',
  email: 'prototype@local',
}

async function getPrototypeFallbackProfile(preferredRole?: Role) {
  const sb = await createClient()

  const pickProfile = async (role?: Role) => {
    let query = sb
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('is_active', true)
      .limit(1)

    if (role) query = query.eq('role', role)

    const { data } = await query.maybeSingle()
    return data as { id: string; role: Role; full_name: string | null; email?: string | null } | null
  }

  return (
    (preferredRole ? await pickProfile(preferredRole) : null)
    ?? (await pickProfile('admin'))
    ?? (await pickProfile('super_admin'))
    ?? (await pickProfile())
  )
}

/**
 * Retrieves the current session with a prototype-safe fallback.
 * In prototype mode the app stays directly usable without login, so the
 * server falls back to the first active profile or a synthetic admin-like
 * operator identity when no authenticated user is present.
 */
export async function getServerSession(): Promise<ServerSession> {
  const sb = await createClient()

  const authResponse = await sb.auth.getUser()
  const user = authResponse.data.user

  if (user) {
    const { data } = (await sb
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', user.id)
      .maybeSingle()) as { data: { id: string; role: Role; full_name: string | null } | null; error: unknown }

    if (data) {
      const role: Role = data.role ?? 'viewer'
      return {
        user: { id: user.id, email: user.email ?? '' },
        profile: {
          id: data.id,
          role,
          full_name: data.full_name ?? null,
        },
        role,
      }
    }
  }

  const fallbackProfile = await getPrototypeFallbackProfile()
  const fallbackRole = fallbackProfile?.role ?? 'admin'

  return {
    user: {
      id: fallbackProfile?.id ?? PROTOTYPE_FALLBACK_USER.id,
      email: fallbackProfile?.email ?? PROTOTYPE_FALLBACK_USER.email,
    },
    profile: {
      id: fallbackProfile?.id ?? PROTOTYPE_FALLBACK_USER.id,
      role: fallbackRole,
      full_name: fallbackProfile?.full_name ?? 'Prototype Operator',
    },
    role: fallbackRole,
  }
}

/** Lightweight helper for layouts and UI. */
export async function getSession(): Promise<Session | null> {
  const session = await getServerSession()
  return { user: session.user, role: session.role }
}

export async function requireSession(): Promise<Session> {
  const session = await getSession()
  return session ?? { user: PROTOTYPE_FALLBACK_USER, role: 'admin' }
}
