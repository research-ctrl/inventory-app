'use server'

import { createClient } from '@/lib/supabase/server'

export interface PurchaseItemResult {
  id: string           // inventory_pin.id
  pin_number: string
  description: string
  part_number: string | null
  category: string | null
  unit: string | null
  current_stock: number
  location_code: string | null
  vendor_id: string | null
  vendor_name: string | null
  last_unit_price: number | null
  last_currency: string | null
}

/**
 * Search ALL catalogued inventory items (including 0-stock and never-stocked)
 * for the Purchase request form.
 * Queries inventory_pins directly so every registered item is findable.
 * Also returns the last known purchase price from completed POs.
 */
export async function searchItemsForPurchase(query: string): Promise<PurchaseItemResult[]> {
  if (!query || query.trim().length < 2) return []

  try {
    const sb = await createClient()
    const q = query.trim()

    // Query inventory_pins directly — all items regardless of stock level
    const { data, error } = await sb
      .from('inventory_pins')
      .select(`
        id,
        pin_number,
        description,
        part_number,
        category,
        unit,
        vendor_id,
        vendor:vendors!inventory_pins_vendor_id_fkey (id, name),
        location:store_locations!inventory_pins_location_id_fkey (code)
      `)
      .or(`description.ilike.%${q}%,pin_number.ilike.%${q}%,part_number.ilike.%${q}%`)
      .order('description')
      .limit(12)

    if (error) {
      console.error('[searchItemsForPurchase] pins error:', error.message)
      // Fall back to v_stock_balance if pins query fails
      return fallbackSearch(query)
    }
    if (!data || data.length === 0) return []

    const pinIds = (data as any[]).map((r) => r.id).filter(Boolean)

    // Get current stock from v_stock_balance for display
    const { data: stockRows } = await sb
      .from('v_stock_balance')
      .select('pin_id, current_stock')
      .in('pin_id', pinIds)

    const stockMap = new Map<string, number>()
    for (const row of (stockRows ?? []) as any[]) {
      stockMap.set(row.pin_id, row.current_stock ?? 0)
    }

    // Fetch last purchase price from po_items linked to this PIN
    const { data: priceRows } = await sb
      .from('po_items')
      .select('inventory_pin_id, unit_price, currency, po_id')
      .in('inventory_pin_id', pinIds)

    const priceMap = new Map<string, { price: number; currency: string }>()

    if (priceRows && priceRows.length > 0) {
      const poIds = [...new Set((priceRows as any[]).map((r: any) => r.po_id))]
      const { data: poRows } = await sb
        .from('purchase_orders')
        .select('id, status, created_at')
        .in('id', poIds)
        .in('status', ['ordered', 'delivered', 'partially_delivered', 'closed', 'approved'])
        .order('created_at', { ascending: false })

      const validPoIds = new Set((poRows ?? []).map((p: any) => p.id))

      for (const row of priceRows as any[]) {
        if (validPoIds.has(row.po_id) && !priceMap.has(row.inventory_pin_id)) {
          priceMap.set(row.inventory_pin_id, {
            price: row.unit_price,
            currency: row.currency,
          })
        }
      }
    }

    return (data as any[]).map((row) => {
      const priceInfo = priceMap.get(row.id)
      return {
        id: row.id,
        pin_number: row.pin_number,
        description: row.description,
        part_number: row.part_number ?? null,
        category: row.category ?? null,
        unit: row.unit ?? null,
        current_stock: stockMap.get(row.id) ?? 0,
        location_code: (row.location as any)?.code ?? null,
        vendor_id: row.vendor_id ?? null,
        vendor_name: (row.vendor as any)?.name ?? null,
        last_unit_price: priceInfo?.price ?? null,
        last_currency: priceInfo?.currency ?? null,
      }
    })
  } catch (e: any) {
    console.error('[searchItemsForPurchase] error:', e.message)
    return []
  }
}

/** Fallback: use v_stock_balance if inventory_pins query fails */
async function fallbackSearch(query: string): Promise<PurchaseItemResult[]> {
  try {
    const sb = await createClient()
    const q = query.trim()
    const { data } = await sb
      .from('v_stock_balance')
      .select('id:pin_id, pin_number, description, part_number, category, unit, current_stock, location_code, vendor_name, vendor_id')
      .or(`description.ilike.%${q}%,pin_number.ilike.%${q}%,part_number.ilike.%${q}%`)
      .order('description')
      .limit(12)
    return (data ?? []) as PurchaseItemResult[]
  } catch {
    return []
  }
}
