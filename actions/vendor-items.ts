'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'
import { can } from '@/lib/permissions/checks'
import { z } from 'zod'

// ── Validation ────────────────────────────────────────────────────────────────

const VendorItemSchema = z.object({
  vendor_id:          z.string().uuid(),
  description:        z.string().min(1, 'Description required').max(500),
  part_number:        z.string().max(100).optional().nullable(),
  vendor_part_number: z.string().max(100).optional().nullable(),
  category:           z.string().max(100).optional().nullable(),
  unit:               z.string().min(1).max(20).default('EA'),
  unit_price:         z.coerce.number().min(0, 'Price must be 0 or more'),
  currency:           z.string().length(3).default('USD'),
  lead_time_days:     z.coerce.number().int().min(0).optional().nullable(),
  transport_cost:     z.coerce.number().min(0).optional().nullable(),
  min_order_qty:      z.coerce.number().min(0).optional().nullable(),
  notes:              z.string().max(1000).optional().nullable(),
})

export type VendorItemInput = z.infer<typeof VendorItemSchema>

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getVendorItems(vendorId: string) {
  const sb = await createClient()
  const { data } = await (sb as any)
    .from('vendor_items')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('is_active', true)
    .order('description')
  return (data ?? []) as any[]
}

export async function searchVendorItems(query: string, vendorId?: string) {
  const sb = await createClient()
  let q = (sb as any)
    .from('vendor_items')
    .select('*, vendor:vendors(id, name)')
    .ilike('description', `%${query}%`)
    .eq('is_active', true)
    .limit(20)
  if (vendorId) q = q.eq('vendor_id', vendorId)
  const { data } = await q
  return (data ?? []) as any[]
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createVendorItem(formData: VendorItemInput) {
  try {
    const { profile, role } = await getServerSession()
    if (!can(role, 'vendor', 'update')) return { success: false, error: 'Insufficient permissions' }

    const parsed = VendorItemSchema.safeParse(formData)
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors }

    const sb = await createClient()
    const { data, error } = await (sb as any).from('vendor_items').insert({
      ...parsed.data,
      created_by: profile.id,
    }).select().single()

    if (error) return { success: false, error: error.message }

    revalidatePath(`/vendors/${parsed.data.vendor_id}`)
    return { success: true, data }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateVendorItem(id: string, formData: Partial<VendorItemInput>) {
  try {
    const { role } = await getServerSession()
    if (!can(role, 'vendor', 'update')) return { success: false, error: 'Insufficient permissions' }

    const sb = await createClient()
    const { data, error } = await (sb as any)
      .from('vendor_items')
      .update(formData)
      .eq('id', id)
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/vendors')
    return { success: true, data }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function toggleVendorItemActive(id: string, isActive: boolean, vendorId: string) {
  try {
    const { role } = await getServerSession()
    if (!can(role, 'vendor', 'update')) return { success: false, error: 'Insufficient permissions' }

    const sb = await createClient()
    const { error } = await (sb as any)
      .from('vendor_items')
      .update({ is_active: isActive })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath(`/vendors/${vendorId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteVendorItem(id: string, vendorId: string) {
  try {
    const { role } = await getServerSession()
    if (!can(role, 'vendor', 'update')) return { success: false, error: 'Insufficient permissions' }

    const sb = await createClient()
    const { error } = await (sb as any).from('vendor_items').delete().eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath(`/vendors/${vendorId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
