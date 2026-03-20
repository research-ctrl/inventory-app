'use server'
import { createClient } from '@/lib/supabase/server'

export async function dbCreateApproval(entityType: string, entityId: string, approverId: string, stepNumber = 1, dueDate?: string) {
  const sb = await createClient()
  const { data, error } = await sb.from('approvals').insert({
    entity_type: entityType,
    entity_id: entityId,
    approver_id: approverId,
    step_number: stepNumber,
    status: 'pending_approval',
    due_date: dueDate,
  }).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function dbDecideApproval(approvalId: string, decision: 'approve' | 'reject', comment?: string) {
  const sb = await createClient()
  const status = decision === 'approve' ? 'approved' : 'rejected'
  const { error } = await sb.from('approvals').update({
    status: status as any,
    comment,
    decided_at: new Date().toISOString(),
  }).eq('id', approvalId)
  if (error) throw new Error(error.message)
}
