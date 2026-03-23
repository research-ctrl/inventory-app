'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerSession } from '@/lib/auth/session'

/** Public — returns parsed accounts email list. Used by client components to preview recipients. */
export async function getAccountsEmailsList(): Promise<string[]> {
  const envEmails = (process.env.ACCOUNTS_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
  try {
    const sb = createAdminClient()
    const { data } = await (sb as any)
      .from('system_settings')
      .select('value')
      .eq('key', 'accounts_emails')
      .single()
    if (data?.value) {
      const dbEmails = data.value.split(',').map((e: string) => e.trim()).filter(Boolean)
      if (dbEmails.length) return dbEmails
    }
  } catch { /* table may not exist yet */ }
  return envEmails
}

export async function getSystemSettings(): Promise<Record<string, string>> {
  const sb = createAdminClient()
  const { data } = await (sb as any).from('system_settings').select('key, value')
  if (!data) return {}
  return Object.fromEntries(data.map((r: any) => [r.key, r.value]))
}

export async function getSystemSetting(key: string): Promise<string> {
  const sb = createAdminClient()
  const { data } = await (sb as any).from('system_settings').select('value').eq('key', key).single()
  return data?.value ?? ''
}

export async function upsertSystemSetting(key: string, value: string) {
  try {
    const { profile, role } = await getServerSession()
    if (!['super_admin', 'admin'].includes(role)) {
      return { success: false, error: 'Insufficient permissions' }
    }
    const sb = createAdminClient()
    const { error } = await (sb as any)
      .from('system_settings')
      .upsert({ key, value, updated_by: profile.id, updated_at: new Date().toISOString() })
    if (error) throw new Error(error.message)
    revalidatePath('/admin-portal/settings')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function upsertSystemSettings(settings: Record<string, string>) {
  try {
    const { profile, role } = await getServerSession()
    if (!['super_admin', 'admin'].includes(role)) {
      return { success: false, error: 'Insufficient permissions' }
    }
    const sb = createAdminClient()
    const rows = Object.entries(settings).map(([key, value]) => ({
      key,
      value,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    }))
    const { error } = await (sb as any).from('system_settings').upsert(rows)
    if (error) throw new Error(error.message)
    revalidatePath('/admin-portal/settings')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
