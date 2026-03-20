'use server'
import { createClient } from '@/lib/supabase/server'

export async function getOperatorProfiles() {
  const sb = await createClient()
  const { data, error } = await sb
    .from('profiles')
    .select('id, full_name, email, role, department, is_active')
    .eq('is_active', true)
    .order('full_name')
  if (error) throw new Error(error.message)
  return (data ?? []) as Array<{
    id: string
    full_name: string | null
    email: string
    role: string
    department: string | null
    is_active: boolean
  }>
}
