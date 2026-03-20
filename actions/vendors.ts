'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'
import { can } from '@/lib/permissions/checks'
import { CreateVendorSchema, UpdateVendorSchema } from '@/lib/validations/vendor'
import type { CreateVendorInput, UpdateVendorInput } from '@/lib/validations/vendor'

export async function createVendor(formData: CreateVendorInput) {
  try {
    const { profile, role } = await getServerSession()
    if (!can(role, 'vendor', 'create')) return { success: false, error: 'Insufficient permissions' }
    const parsed = CreateVendorSchema.safeParse(formData)
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors }
    const sb = await createClient()
    const { data, error } = await sb.from('vendors').insert(parsed.data).select().single()
    if (error) return { success: false, error: error.message }
    revalidatePath('/vendors')
    return { success: true, data }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateVendor(id: string, formData: UpdateVendorInput) {
  try {
    const { role } = await getServerSession()
    if (!can(role, 'vendor', 'update')) return { success: false, error: 'Insufficient permissions' }
    const parsed = UpdateVendorSchema.safeParse({ ...formData, id })
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors }
    const sb = await createClient()
    const { id: _id, ...updateData } = parsed.data
    const { data, error } = await sb.from('vendors').update(updateData).eq('id', id).select().single()
    if (error) return { success: false, error: error.message }
    revalidatePath('/vendors')
    revalidatePath(`/vendors/${id}`)
    return { success: true, data }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function approveVendor(id: string) {
  try {
    const { profile, role } = await getServerSession()
    if (!can(role, 'vendor', 'approve')) return { success: false, error: 'Insufficient permissions' }
    const sb = await createClient()
    const { error } = await sb.from('vendors').update({
      is_approved: true, approved_by: profile.id, approved_at: new Date().toISOString()
    }).eq('id', id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/vendors')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function rejectVendor(id: string, reason: string) {
  try {
    const { role } = await getServerSession()
    if (!can(role, 'vendor', 'approve')) return { success: false, error: 'Insufficient permissions' }
    const sb = await createClient()
    const { error } = await sb.from('vendors').update({
      is_approved: false, blacklisted: false, blacklist_reason: reason
    }).eq('id', id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/vendors')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
