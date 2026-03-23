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

  const rows = data ?? []
  if (rows.length === 0) return rows

  // Enrich with entity reference numbers for better display
  const reqIds = rows.filter((r) => r.entity_type === 'requirement').map((r) => r.entity_id as string)
  const poIds  = rows.filter((r) => r.entity_type === 'purchase_order').map((r) => r.entity_id as string)

  const reqMap: Record<string, string> = {}
  const poMap:  Record<string, string> = {}

  if (reqIds.length > 0) {
    const { data: reqs } = await sb.from('requirements').select('id, ref_number, title').in('id', reqIds)
    for (const r of reqs ?? []) reqMap[r.id] = r.ref_number ?? r.title ?? r.id.substring(0, 8)
  }
  if (poIds.length > 0) {
    const { data: pos } = await sb.from('purchase_orders').select('id, po_number').in('id', poIds)
    for (const p of pos ?? []) poMap[p.id] = (p as any).po_number ?? p.id.substring(0, 8)
  }

  return rows.map((r) => ({
    ...r,
    entity_ref:
      r.entity_type === 'requirement'   ? (reqMap[r.entity_id!] ?? r.entity_id?.substring(0, 8))
      : r.entity_type === 'purchase_order' ? (poMap[r.entity_id!]  ?? r.entity_id?.substring(0, 8))
      : r.entity_id?.substring(0, 8),
  }))
}

export async function getCompletedApprovals(userId?: string) {
  const sb = await createClient()
  let query = sb
    .from('approvals')
    .select(`
      id, entity_type, entity_id, step_number, status, comment, due_date, decided_at, created_at,
      approver:profiles!approvals_approver_id_fkey(id, full_name, email)
    `)
    .in('status', ['approved', 'rejected'])
    .order('decided_at', { ascending: false })

  if (userId) query = query.eq('approver_id', userId)
  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = data ?? []
  if (rows.length === 0) return rows

  const reqIds = rows.filter((r) => r.entity_type === 'requirement').map((r) => r.entity_id as string)
  const poIds  = rows.filter((r) => r.entity_type === 'purchase_order').map((r) => r.entity_id as string)

  const reqMap: Record<string, string> = {}
  const poMap:  Record<string, string> = {}

  if (reqIds.length > 0) {
    const { data: reqs } = await sb.from('requirements').select('id, ref_number, title').in('id', reqIds)
    for (const r of reqs ?? []) reqMap[r.id] = r.ref_number ?? r.title ?? r.id.substring(0, 8)
  }
  if (poIds.length > 0) {
    const { data: pos } = await sb.from('purchase_orders').select('id, po_number').in('id', poIds)
    for (const p of pos ?? []) poMap[p.id] = (p as any).po_number ?? p.id.substring(0, 8)
  }

  return rows.map((r) => ({
    ...r,
    entity_ref:
      r.entity_type === 'requirement'   ? (reqMap[r.entity_id!] ?? r.entity_id?.substring(0, 8))
      : r.entity_type === 'purchase_order' ? (poMap[r.entity_id!]  ?? r.entity_id?.substring(0, 8))
      : r.entity_id?.substring(0, 8),
  }))
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
