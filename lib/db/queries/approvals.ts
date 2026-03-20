'use server'
import { createClient } from '@/lib/supabase/server'

export async function getPendingApprovals(userId?: string) {
  const sb = await createClient()
  let query = sb
    .from('approvals')
    .select(`
      id, entity_type, entity_id, step_number, status, comment, due_date, escalated, created_at,
      approver:profiles!approvals_approver_id_fkey(id, full_name, email)
    `)
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false })

  if (userId) query = query.eq('approver_id', userId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getApprovalsForEntity(entityType: string, entityId: string) {
  const sb = await createClient()
  const { data, error } = await sb
    .from('approvals')
    .select(`*, approver:profiles!approvals_approver_id_fkey(id, full_name, email)`)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('step_number')
  if (error) throw new Error(error.message)
  return data ?? []
}
