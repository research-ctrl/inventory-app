'use server'

import { createClient } from '@/lib/supabase/server'

export interface InventorySearchResult {
  id: string
  pin_number: string
  description: string
  part_number: string | null
  category: string | null
  unit: string | null
  current_stock: number
  location_code: string | null
  vendor_name: string | null
  condition: string | null
  is_reusable: boolean | null
  notes: string | null
}

/**
 * Search inventory pins by description, pin number, or part number.
 * Queries v_stock_balance (includes vendor_name, location_code, current_stock).
 */
export async function searchInventoryPins(
  query: string,
): Promise<InventorySearchResult[]> {
  if (!query || query.trim().length < 2) return []

  try {
    const sb = await createClient()
    const q = query.trim()

    const { data, error } = await sb
      .from('v_stock_balance')
      .select(
        'id:pin_id, pin_number, description, part_number, category, unit, current_stock, location_code, vendor_name'
      )
      .or(`description.ilike.%${q}%,pin_number.ilike.%${q}%,part_number.ilike.%${q}%`)
      .order('current_stock', { ascending: false })
      .limit(10)

    if (error) {
      console.error('[searchInventoryPins] view query error:', error.message)
      return []
    }
    if (!data || data.length === 0) return []

    // Filter: only show items with stock > 0 (can't release what's not in stock)
    const withStock = (data as any[]).filter((r) => (r.current_stock ?? 0) > 0)
    if (withStock.length === 0) return []

    // Enrich with condition, reusability and notes from inventory_pins
    const ids = withStock.map((r) => r.id)
    const { data: pinDetails } = await sb
      .from('inventory_pins')
      .select('id, condition, is_reusable, notes')
      .in('id', ids)

    const detailMap = new Map(
      (pinDetails ?? []).map((p: any) => [p.id, p])
    )

    return withStock.map((row) => {
      const detail = detailMap.get(row.id)
      return {
        id: row.id,
        pin_number: row.pin_number,
        description: row.description,
        part_number: row.part_number ?? null,
        category: row.category ?? null,
        unit: row.unit ?? null,
        current_stock: row.current_stock ?? 0,
        location_code: row.location_code ?? null,
        vendor_name: row.vendor_name ?? null,
        condition: detail?.condition ?? null,
        is_reusable: detail?.is_reusable ?? null,
        notes: detail?.notes ?? null,
      }
    })
  } catch (e: any) {
    console.error('[searchInventoryPins] error:', e.message)
    return []
  }
}
