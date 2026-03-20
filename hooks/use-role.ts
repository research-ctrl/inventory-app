'use client'

import { useEffect, useState } from 'react'
import type { Role } from '@/lib/auth/roles'

const STORAGE_KEY = 'smls.prototype.operator'

const TEAM_ROLE_MAP: Record<string, Role> = {
  stores: 'store_keeper',
  qc: 'qc_inspector',
  procurement: 'procurement_officer',
  finance: 'finance',
  engineering: 'engineer',
  engineer: 'engineer',
  shipbuilder: 'shipbuilder',
  operations: 'shipbuilder',
}

function resolvePrototypeRole(): Role {
  if (typeof window === 'undefined') return 'admin'

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return 'admin'
    const parsed = JSON.parse(raw) as { team?: string }
    const team = parsed.team?.trim().toLowerCase() ?? ''
    return TEAM_ROLE_MAP[team] ?? 'admin'
  } catch {
    return 'admin'
  }
}

export function useRole(): Role | null {
  const [role, setRole] = useState<Role | null>(null)

  useEffect(() => {
    const sync = () => setRole(resolvePrototypeRole())
    sync()
    window.addEventListener('storage', sync)
    window.addEventListener('prototype-operator-updated', sync as EventListener)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('prototype-operator-updated', sync as EventListener)
    }
  }, [])

  return role
}
