import { createClient } from '@/lib/supabase/server'

export type RecoveryRow = {
  id: string
  recovery_ref: string
  issue_id: string | null
  pin_id: string
  quantity_returned: number
  outcome: 'reuse' | 'repair' | 'scrap' | 'sell' | null
  status: string
  condition_grade: 'A' | 'B' | 'C' | 'D' | 'scrap' | null
  condition_notes: string | null
  assessed_by: string | null
  assessed_at: string | null
  disposition_notes: string | null
  derived_pin_id: string | null
  recovery_location_id: string | null
  recovered_at: string | null
  created_at: string
  updated_at: string
}

/**
 * recoveries with issue, pin, assessed_by profile, derived_pin joins
 */
export async function getRecoveries(filters?: {
  status?: string
  outcome?: string
  issue_id?: string
}): Promise<RecoveryRow[]> {
  const sb = await createClient()

  let query = sb
    .from('recoveries')
    .select(
      `*,
       issue:material_issues!recoveries_issue_id_fkey(
         id, issue_number, quantity, unit, purpose, status
       ),
       pin:inventory_pins!recoveries_pin_id_fkey(
         id, pin_number, description, part_number, unit, category
       ),
       assessed_by_profile:profiles!recoveries_assessed_by_fkey(
         id, full_name, email
       ),
       derived_pin:inventory_pins!recoveries_derived_pin_id_fkey(
         id, pin_number, description, unit, status
       ),
       recovery_location:store_locations!recoveries_recovery_location_id_fkey(
         id, code, name
       )`
    )
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.outcome) {
    query = query.eq('outcome', filters.outcome)
  }
  if (filters?.issue_id) {
    query = query.eq('issue_id', filters.issue_id)
  }

  const { data, error } = await query
  if (error) throw new Error(`getRecoveries: ${error.message}`)
  return (data ?? []) as unknown as RecoveryRow[]
}

/**
 * Full recovery detail with all joins including issue -> pin -> transactions
 */
export async function getRecoveryById(id: string) {
  const sb = await createClient()

  const { data, error } = await sb
    .from('recoveries')
    .select(
      `*,
       issue:material_issues!recoveries_issue_id_fkey(
         id, issue_number, quantity, quantity_returned, unit, purpose, status,
         issued_at, expected_return_date,
         pin:inventory_pins!material_issues_pin_id_fkey(
           id, pin_number, description, part_number, unit, category
         ),
         vessel:vessels(id, name)
       ),
       pin:inventory_pins!recoveries_pin_id_fkey(
         id, pin_number, description, part_number, unit, category, location_id,
         transactions:inventory_transactions(
           id, transaction_type, quantity, quantity_before, quantity_after,
           reference_type, created_at
         )
       ),
       assessed_by_profile:profiles!recoveries_assessed_by_fkey(
         id, full_name, email
       ),
       derived_pin:inventory_pins!recoveries_derived_pin_id_fkey(
         id, pin_number, description, unit, status, location_id
       ),
       recovery_location:store_locations!recoveries_recovery_location_id_fkey(
         id, code, name
       )`
    )
    .eq('id', id)
    .single()

  if (error) throw new Error(`getRecoveryById: ${error.message}`)
  return data as unknown as Record<string, unknown>
}

/**
 * inventory_pins where parent_pin_id IS NOT NULL with parent and recovery joins
 */
export async function getDerivedPins() {
  const sb = await createClient()

  const { data, error } = await sb
    .from('inventory_pins')
    .select(
      `*,
       parent_pin:inventory_pins!inventory_pins_parent_pin_id_fkey(
         id, pin_number, description, unit
       ),
       recovery:recoveries!recoveries_derived_pin_id_fkey(
         id, recovery_ref, outcome, condition_grade, recovered_at
       ),
       location:store_locations(id, code, name)`
    )
    .not('parent_pin_id', 'is', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`getDerivedPins: ${error.message}`)
  return (data ?? []) as unknown as Record<string, unknown>[]
}

/**
 * inventory_pins where status IN ('scrapped', 'on_hold') with location and stock
 */
export async function getScrapHoldItems() {
  const sb = await createClient()

  const { data, error } = await sb
    .from('v_stock_balance')
    .select('*')
    .in('status', ['scrapped', 'on_hold'])
    .order('pin_number', { ascending: true })

  if (error) throw new Error(`getScrapHoldItems: ${error.message}`)
  return (data ?? []) as unknown as Record<string, unknown>[]
}
