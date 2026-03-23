'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function dbCreateApproval(entityType: string, entityId: string, approverId: string, stepNumber = 1, dueDate?: string) {
  const sb = await createClient()
  const { data, error } = await sb.from('approvals').insert({
    entity_type: entityType,
    entity_id: entityId,
    approver_id: approverId,
    step_number: stepNumber,
    status: 'pending_approval',
    due_date: dueDate,
  }).select('*').single()
  if (error) throw new Error(error.message)
  return data as typeof data & { approval_token?: string }
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

/** Lookup an approval by its public token — uses admin client (no auth required) */
export async function dbGetApprovalByToken(token: string) {
  const adminSb = createAdminClient()
  const { data, error } = await (adminSb as any)
    .from('approvals')
    .select(`
      id, entity_type, entity_id, status, approval_token, token_used_at, comment, due_date,
      approver:profiles!approvals_approver_id_fkey(id, full_name, email)
    `)
    .eq('approval_token', token)
    .single()
  if (error || !data) return null
  return data
}

/** Decide approval using token — no session required, uses admin client */
export async function dbDecideApprovalByToken(
  token: string,
  decision: 'approve' | 'reject',
  comment?: string,
): Promise<{ ok: boolean; error?: string; approvalId?: string; entityType?: string; entityId?: string }> {
  const adminSb = createAdminClient()

  // Load approval
  const { data: approval, error: loadErr } = await (adminSb as any)
    .from('approvals')
    .select('id, entity_type, entity_id, status, token_used_at')
    .eq('approval_token', token)
    .single()

  if (loadErr || !approval) return { ok: false, error: 'Approval link is invalid or has expired.' }
  if ((approval as any).token_used_at) return { ok: false, error: 'This approval has already been decided.' }
  if ((approval as any).status !== 'pending_approval') return { ok: false, error: `This item is already ${(approval as any).status}.` }

  const status = decision === 'approve' ? 'approved' : 'rejected'

  // Mark token as used and set decision
  const { error: updateErr } = await (adminSb as any)
    .from('approvals')
    .update({
      status,
      comment: comment ?? null,
      decided_at: new Date().toISOString(),
      token_used_at: new Date().toISOString(),
    })
    .eq('id', (approval as any).id)

  if (updateErr) return { ok: false, error: updateErr.message }

  return {
    ok: true,
    approvalId: (approval as any).id,
    entityType: (approval as any).entity_type,
    entityId: (approval as any).entity_id,
  }
}
