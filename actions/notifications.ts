'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerSession } from '@/lib/auth/session'

// ── Read helpers ──────────────────────────────────────────────────────────────

export async function getMyNotifications() {
  const { profile } = await getServerSession()
  const sb = await createClient()
  const { data } = await sb
    .from('notifications')
    .select('*')
    .eq('recipient_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []) as any[]
}

export async function getUnreadCount(): Promise<number> {
  const { profile } = await getServerSession()
  const sb = await createClient()
  const { count } = await sb
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', profile.id)
    .eq('is_read', false)
  return count ?? 0
}

// ── Mutation helpers ──────────────────────────────────────────────────────────

export async function markNotificationRead(id: string) {
  const { profile } = await getServerSession()
  const sb = await createClient()
  await sb
    .from('notifications')
    .update({ is_read: true } as any)
    .eq('id', id)
    .eq('recipient_id', profile.id) // safety: only own notifications
  revalidatePath('/notifications')
}

export async function markAllNotificationsRead() {
  const { profile } = await getServerSession()
  const sb = await createClient()
  await sb
    .from('notifications')
    .update({ is_read: true } as any)
    .eq('recipient_id', profile.id)
    .eq('is_read', false)
  revalidatePath('/notifications')
}

// ── Internal helper (server-side only) ───────────────────────────────────────
// Uses the admin (service-role) client so it bypasses RLS — never expose to client.

export async function createNotification(opts: {
  recipientId: string
  entityType: string
  entityId: string
  title: string
  body?: string
}): Promise<void> {
  try {
    const adminSb = createAdminClient()
    await (adminSb as any).from('notifications').insert({
      recipient_id: opts.recipientId,
      entity_type:  opts.entityType,
      entity_id:    opts.entityId,
      title:        opts.title,
      body:         opts.body ?? null,
      is_read:      false,
    })
  } catch {
    // Non-fatal — notification failure must never block a workflow transition
  }
}
