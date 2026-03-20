import { createClient } from '@/lib/supabase/server'

export type IssueRow = {
  id: string
  issue_number: string
  pin_id: string
  issued_to: string
  vessel_id: string | null
  work_order: string | null
  quantity: number
  quantity_returned: number
  unit: string
  status: string
  purpose: string | null
  approved_by: string | null
  approved_at: string | null
  issued_by: string | null
  issued_at: string | null
  expected_return_date: string | null
  usage_outcome: string | null
  outcome_notes: string | null
  outcome_captured_at: string | null
  created_at: string
  updated_at: string
}

/**
 * material_issues with pin, issued_to_profile, vessel joins
 */
export async function getIssues(filters?: {
  status?: string
  pin_id?: string
  vessel_id?: string
  search?: string
}): Promise<IssueRow[]> {
  const sb = await createClient()

  let query = sb
    .from('material_issues')
    .select(
      `*,
       pin:inventory_pins!material_issues_pin_id_fkey(
         id, pin_number, description, part_number, unit, category
       ),
       issued_to_profile:profiles!material_issues_issued_to_fkey(
         id, full_name, email, role, department
       ),
       vessel:vessels(id, name)`
    )
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.pin_id) {
    query = query.eq('pin_id', filters.pin_id)
  }
  if (filters?.vessel_id) {
    query = query.eq('vessel_id', filters.vessel_id)
  }
  if (filters?.search) {
    query = query.or(
      `issue_number.ilike.%${filters.search}%,work_order.ilike.%${filters.search}%,purpose.ilike.%${filters.search}%`
    )
  }

  const { data, error } = await query
  if (error) throw new Error(`getIssues: ${error.message}`)
  return (data ?? []) as unknown as IssueRow[]
}

/**
 * Full issue detail with all profile joins and related recoveries
 */
export async function getIssueById(id: string) {
  const sb = await createClient()

  const { data, error } = await sb
    .from('material_issues')
    .select(
      `*,
       pin:inventory_pins!material_issues_pin_id_fkey(
         id, pin_number, description, part_number, unit, category, location_id,
         location:store_locations(id, code, name)
       ),
       vessel:vessels(id, name),
       issued_to_profile:profiles!material_issues_issued_to_fkey(
         id, full_name, email, role, department
       ),
       issued_by_profile:profiles!material_issues_issued_by_fkey(
         id, full_name, email
       ),
       approved_by_profile:profiles!material_issues_approved_by_fkey(
         id, full_name, email
       ),
       recoveries(
         id, recovery_ref, quantity_returned, outcome, status,
         condition_grade, condition_notes, assessed_by, assessed_at,
         derived_pin_id, recovered_at
       )`
    )
    .eq('id', id)
    .single()

  if (error) throw new Error(`getIssueById: ${error.message}`)
  return data as unknown as Record<string, unknown>
}

/**
 * All issues for a specific PIN
 */
export async function getIssuesForPin(pinId: string): Promise<IssueRow[]> {
  const sb = await createClient()

  const { data, error } = await sb
    .from('material_issues')
    .select(
      `*,
       issued_to_profile:profiles!material_issues_issued_to_fkey(
         id, full_name, email
       ),
       vessel:vessels(id, name)`
    )
    .eq('pin_id', pinId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`getIssuesForPin: ${error.message}`)
  return (data ?? []) as unknown as IssueRow[]
}

/**
 * Issues where status IN ('approved', 'issued', 'partially_returned')
 */
export async function getActiveIssues(): Promise<IssueRow[]> {
  const sb = await createClient()

  const { data, error } = await sb
    .from('material_issues')
    .select(
      `*,
       pin:inventory_pins!material_issues_pin_id_fkey(
         id, pin_number, description, unit
       ),
       issued_to_profile:profiles!material_issues_issued_to_fkey(
         id, full_name, email
       ),
       vessel:vessels(id, name)`
    )
    .in('status', ['approved', 'issued', 'partially_returned'])
    .order('issued_at', { ascending: false })

  if (error) throw new Error(`getActiveIssues: ${error.message}`)
  return (data ?? []) as unknown as IssueRow[]
}
