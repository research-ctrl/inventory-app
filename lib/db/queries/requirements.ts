'use server'
import { createClient } from '@/lib/supabase/server'

export type RequirementRow = {
  id: string
  ref_number: string
  title: string
  description: string | null
  urgency: string
  status: string
  required_date: string | null
  budget_estimate: number | null
  currency: string
  created_at: string
  vessel: { id: string; name: string } | null
  department: { id: string; name: string; code: string } | null
  requested_by_profile: { id: string; full_name: string | null; email: string } | null
}

export async function getRequirements(filters?: {
  status?: string
  urgency?: string
  vessel_id?: string
  search?: string
}): Promise<RequirementRow[]> {
  const sb = await createClient()
  let query = sb
    .from('requirements')
    .select(`
      id, ref_number, title, description, urgency, status,
      required_date, budget_estimate, currency, created_at,
      vessel:vessels(id, name),
      department:departments(id, name, code),
      requested_by_profile:profiles!requirements_requested_by_fkey(id, full_name, email)
    `)
    .order('created_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.urgency) query = query.eq('urgency', filters.urgency)
  if (filters?.vessel_id) query = query.eq('vessel_id', filters.vessel_id)
  if (filters?.search) query = query.ilike('title', `%${filters.search}%`)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as RequirementRow[]
}

export async function getRequirementById(id: string) {
  const sb = await createClient()
  const { data, error } = await sb
    .from('requirements')
    .select(`
      *,
      vessel:vessels(id, name, imo_number, vessel_type),
      department:departments(id, name, code),
      requested_by_profile:profiles!requirements_requested_by_fkey(id, full_name, email),
      approved_by_profile:profiles!requirements_approved_by_fkey(id, full_name, email),
      assigned_approver:profiles!requirements_assigned_approver_id_fkey(id, full_name, email),
      preferred_vendor:vendors!requirements_preferred_vendor_id_fkey(id, name, email),
      inventory_pin:inventory_pins!requirements_inventory_pin_id_fkey(id, pin_number, description),
      requirement_items(*)
    `)
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getVessels() {
  const sb = await createClient()
  const { data } = await sb.from('vessels').select('id, name, imo_number').eq('is_active', true).order('name')
  return data ?? []
}

export async function getDepartments() {
  const sb = await createClient()
  const { data } = await sb.from('departments').select('id, name, code').eq('is_active', true).order('name')
  return data ?? []
}

export async function getApprovers() {
  const sb = await createClient()
  const { data } = await sb
    .from('profiles')
    .select('id, full_name, email, role')
    .in('role', ['super_admin', 'admin', 'procurement_manager', 'approver'])
    .order('full_name')
  return data ?? []
}
