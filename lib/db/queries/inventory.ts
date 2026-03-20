'use server'
import { createClient } from '@/lib/supabase/server'

export type StockCheckResult = {
  pin_id: string
  pin_number: string
  description: string
  part_number: string | null
  current_stock: number
  unit: string
  location_code: string | null
  location_name: string | null
}

export async function checkStock(partNumber?: string, description?: string): Promise<StockCheckResult[]> {
  const sb = await createClient()
  let query = sb
    .from('inventory_pins')
    .select(`
      id, pin_number, description, part_number, unit, status,
      location:store_locations(code, name),
      inventory_transactions(transaction_type, quantity)
    `)
    .neq('status', 'scrapped')

  if (partNumber) query = query.ilike('part_number', `%${partNumber}%`)
  if (description) query = query.ilike('description', `%${description}%`)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data ?? []).map((pin: any) => {
    const stock = (pin.inventory_transactions ?? []).reduce((sum: number, t: any) => {
      if (['receipt', 'return', 'adjustment'].includes(t.transaction_type) && t.quantity > 0) return sum + t.quantity
      if (['issue', 'transfer', 'write_off'].includes(t.transaction_type)) return sum - t.quantity
      return sum + t.quantity
    }, 0)
    return {
      pin_id: pin.id,
      pin_number: pin.pin_number,
      description: pin.description,
      part_number: pin.part_number,
      current_stock: Math.max(0, stock),
      unit: pin.unit,
      location_code: pin.location?.code ?? null,
      location_name: pin.location?.name ?? null,
    }
  })
}

export async function getInventoryPins(filters?: { search?: string; location_id?: string }) {
  const sb = await createClient()
  let query = sb
    .from('inventory_pins')
    .select(`*, location:store_locations(id, code, name)`)
    .order('pin_number')
  if (filters?.search) query = query.or(`description.ilike.%${filters.search}%,part_number.ilike.%${filters.search}%,pin_number.ilike.%${filters.search}%`)
  if (filters?.location_id) query = query.eq('location_id', filters.location_id)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}
