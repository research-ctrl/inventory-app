'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Operator } from '@/lib/operator'

const STORAGE_KEY = 'smls_operator'

export function OperatorGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOperator() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setLoading(false)
          return
        }

        // Fetch profile and set as operator automatically
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, role, email, department')
          .eq('id', user.id)
          .single()

        if (profile) {
          const operator: Operator = {
            id: profile.id,
            name: profile.full_name ?? profile.email ?? user.email ?? 'User',
            role: profile.role ?? 'viewer',
            email: profile.email ?? user.email ?? '',
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(operator))
        } else {
          // No profile row yet — use auth user info directly
          const operator: Operator = {
            id: user.id,
            name: user.email ?? 'User',
            role: 'viewer',
            email: user.email ?? '',
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(operator))
        }
      } catch {
        // Silently continue — operator gate should not block the UI
      }
      setLoading(false)
    }

    loadOperator()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
