'use server'
import { createClient } from '@/lib/supabase/server'

export type VendorRow = {
  id: string
  code: string
  name: string
  trade_name: string | null
  email: string | null
  phone: string | null
  city: string | null
  country: string | null
  category: string
  rating: number
  payment_terms_days: number
  is_approved: boolean
  blacklisted: boolean
  created_at: string
}

export async function getVendors(filters?: { category?: string; is_approved?: boolean; search?: string }): Promise<VendorRow[]> {
  const sb = await createClient()
  let query = sb
    .from('vendors')
    .select('id, code, name, trade_name, email, phone, city, country, category, rating, payment_terms_days, is_approved, blacklisted, created_at')
    .eq('blacklisted', false)
    .order('name')

  if (filters?.category) query = query.eq('category', filters.category)
  if (filters?.is_approved !== undefined) query = query.eq('is_approved', filters.is_approved)
  if (filters?.search) query = query.ilike('name', `%${filters.search}%`)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as VendorRow[]
}

export async function getVendorById(id: string) {
  const sb = await createClient()
  const { data, error } = await sb
    .from('vendors')
    .select('*, vendor_contacts(*)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getApprovedVendors() {
  const sb = await createClient()
  const { data, error } = await sb
    .from('vendors')
    .select('id, code, name, category, rating, currency, payment_terms_days')
    .eq('is_approved', true)
    .eq('blacklisted', false)
    .order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

// Returns vendors suitable for a given requirement category for comparison
export async function getVendorsForComparison(vendorIds: string[]) {
  const sb = await createClient()
  const { data, error } = await sb
    .from('vendors')
    .select(`
      id, code, name, category, rating, payment_terms_days, currency,
      purchase_orders(id, status, total_amount, created_at)
    `)
    .in('id', vendorIds)
    .eq('is_approved', true)
  if (error) throw new Error(error.message)
  return data ?? []
}
