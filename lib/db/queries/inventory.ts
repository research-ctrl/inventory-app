import { createClient } from '@/lib/supabase/server'

export type StockRow = {
  pin_id: string
  pin_number: string
  description: string
  part_number: string | null
  category: string | null
  unit: string
  location_id: string | null
  location_code: string | null
  location_name: string | null
  current_stock: number
  min_stock_level: number
  is_low_stock: boolean
  status: string
  parent_pin_id: string | null
  origin_type: string | null
}

/**
 * Query v_stock_balance view with optional filters
 */
export async function getStockBalance(filters?: {
  search?: string
  location_id?: string
  status?: string
  category?: string
}): Promise<StockRow[]> {
  const sb = await createClient()

  let query = sb
    .from('v_stock_balance')
    .select('*')
    .order('pin_number', { ascending: true })

  if (filters?.search) {
    query = query.or(
      `description.ilike.%${filters.search}%,part_number.ilike.%${filters.search}%,pin_number.ilike.%${filters.search}%`
    )
  }
  if (filters?.location_id) {
    query = query.eq('location_id', filters.location_id)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  const { data, error } = await query
  if (error) throw new Error(`getStockBalance: ${error.message}`)
  return (data ?? []) as unknown as StockRow[]
}

/**
 * Full pin detail: pin + location + parent_pin + child_pins + latest transactions (50)
 */
export async function getPinById(id: string) {
  const sb = await createClient()

  const { data, error } = await sb
    .from('inventory_pins')
    .select(
      `*,
       location:store_locations(id, code, name, description),
       parent_pin:inventory_pins!inventory_pins_parent_pin_id_fkey(
         id, pin_number, description, part_number, unit, status
       ),
       derived_pins:inventory_pins!inventory_pins_parent_pin_id_fkey(
         id, pin_number, description, part_number, unit, status, location_id
       ),
       transactions:inventory_transactions(
         id, transaction_type, quantity, quantity_before, quantity_after,
         reference_type, reference_id, location_id, unit_cost, notes, created_at,
         actor:profiles!inventory_transactions_actor_id_fkey(id, full_name)
       )`
    )
    .eq('id', id)
    .order('created_at', { referencedTable: 'transactions', ascending: false })
    .limit(50, { referencedTable: 'transactions' })
    .single()

  if (error) throw new Error(`getPinById: ${error.message}`)
  return data as unknown as Record<string, unknown>
}

/**
 * inventory_transactions for a pin, ordered by created_at DESC
 */
export async function getPinTransactions(pinId: string, limit = 50) {
  const sb = await createClient()

  const { data, error } = await sb
    .from('inventory_transactions')
    .select(
      `*,
       actor:profiles!inventory_transactions_actor_id_fkey(id, full_name)`
    )
    .eq('pin_id', pinId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`getPinTransactions: ${error.message}`)
  return (data ?? []) as unknown as Record<string, unknown>[]
}

/**
 * Active store locations
 */
export async function getStoreLocations() {
  const sb = await createClient()

  const { data, error } = await sb
    .from('store_locations')
    .select('id, code, name, description, parent_id, is_active')
    .eq('is_active', true)
    .order('code', { ascending: true })

  if (error) throw new Error(`getStoreLocations: ${error.message}`)
  return (data ?? []) as unknown as Record<string, unknown>[]
}

/**
 * Distinct non-null categories from inventory_pins
 */
export async function getInventoryCategories(): Promise<string[]> {
  const sb = await createClient()

  const { data, error } = await sb
    .from('inventory_pins')
    .select('category')
    .not('category', 'is', null)
    .order('category', { ascending: true })

  if (error) throw new Error(`getInventoryCategories: ${error.message}`)

  const categories = Array.from(
    new Set((data ?? []).map((row: any) => row.category as string).filter(Boolean))
  )
  return categories
}

/**
 * PINs available for issuance: current_stock > 0 and status = 'approved'
 */
export async function getPinsForIssuance(search?: string): Promise<StockRow[]> {
  const sb = await createClient()

  let query = sb
    .from('v_stock_balance')
    .select('*')
    .eq('status', 'approved')
    .gt('current_stock', 0)
    .order('pin_number', { ascending: true })

  if (search) {
    query = query.or(
      `description.ilike.%${search}%,part_number.ilike.%${search}%,pin_number.ilike.%${search}%`
    )
  }

  const { data, error } = await query
  if (error) throw new Error(`getPinsForIssuance: ${error.message}`)
  return (data ?? []) as unknown as StockRow[]
}
