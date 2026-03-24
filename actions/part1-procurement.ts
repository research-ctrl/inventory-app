'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'
import { can } from '@/lib/permissions/checks'
import { dbIssueItemsFromRequirement } from '@/lib/db/mutations/inventory'

// ─── Revalidate all affected pages ───────────────────────────────────────────

function revalidateAll(requirementId: string) {
  revalidatePath('/procurement/review')
  revalidatePath('/requirements')
  revalidatePath(`/requirements/${requirementId}`)
  revalidatePath('/issued')
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * PM releases inventory items directly — no separate approver needed.
 *
 * For each requirement item that has:
 *   - inventory_pin_id set (linked in the form)
 *   - item_request_type = 'to_release_from_inventory'
 *
 * Creates a material_issue in 'issued' state and deducts stock immediately.
 * Requirement → issued.
 */
export async function releaseFromInventoryNow(
  requirementId: string,
  comment?: string,
) {
  try {
    const { profile, role } = await getServerSession()
    if (!can(role, 'requirement', 'update')) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const sb = await createClient()
    const { data: req } = await sb
      .from('requirements')
      .select('id, status, request_type')
      .eq('id', requirementId)
      .single()

    if (!req) return { success: false, error: 'Requirement not found' }
    if (req.status !== 'submitted') {
      return { success: false, error: `Cannot release — requirement is "${req.status}"` }
    }

    // This is the single source of truth for inventory release.
    // Reads requirement_items where inventory_pin_id IS NOT NULL
    // AND item_request_type = 'to_release_from_inventory', creates
    // material_issues, and inserts inventory_transactions.
    await dbIssueItemsFromRequirement(requirementId, profile.id)

    // Mark requirement as issued
    await sb.from('requirements').update({
      status: 'issued',
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
      procurement_decision_status: 'to_release_from_inventory',
      procurement_decision_made_at: new Date().toISOString(),
      procurement_decision_made_by: profile.id,
    }).eq('id', requirementId)

    await sb.from('workflow_history').insert({
      entity_type: 'requirement',
      entity_id: requirementId,
      from_status: 'submitted' as any,
      to_status: 'issued' as any,
      event: 'release_without_approval' as any,
      actor_id: profile.id,
      comment: comment ?? null,
    })

    revalidateAll(requirementId)
    return { success: true }
  } catch (e: any) {
    // dbIssueItemsFromRequirement throws with a user-readable message
    // e.g. "Insufficient stock for 'Rope' — requested 10, available 3"
    return { success: false, error: e.message }
  }
}

/**
 * PM sends release to a named approver (e.g. captain, HOD).
 * Requirement → pending_approval; approver sees it in their review queue.
 */
export async function requestApprovalForRelease(
  requirementId: string,
  approverId: string,
  comment?: string,
) {
  try {
    const { profile, role } = await getServerSession()
    if (!can(role, 'requirement', 'update')) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const sb = await createClient()
    const { data: req } = await sb
      .from('requirements')
      .select('id, status')
      .eq('id', requirementId)
      .single()

    if (!req || req.status !== 'submitted') {
      return { success: false, error: 'Requirement not in submitted state' }
    }

    await sb.from('requirements').update({
      status: 'pending_approval',
      assigned_approver_id: approverId,
      procurement_decision_status: 'to_release_from_inventory',
      procurement_decision_made_at: new Date().toISOString(),
      procurement_decision_made_by: profile.id,
    }).eq('id', requirementId)

    await sb.from('workflow_history').insert({
      entity_type: 'requirement',
      entity_id: requirementId,
      from_status: 'submitted' as any,
      to_status: 'pending_approval' as any,
      event: 'request_approval' as any,
      actor_id: profile.id,
      comment: comment ?? null,
      metadata: { assigned_approver_id: approverId },
    })

    revalidateAll(requirementId)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/**
 * Assigned approver (or PM) approves a pending inventory release.
 * Same stock deduction logic as releaseFromInventoryNow.
 * Requirement → issued.
 */
export async function approveRelease(
  requirementId: string,
  comment?: string,
) {
  try {
    const { profile, role } = await getServerSession()
    if (!can(role, 'requirement', 'update')) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const sb = await createClient()
    const { data: req } = await sb
      .from('requirements')
      .select('id, status')
      .eq('id', requirementId)
      .single()

    if (!req || req.status !== 'pending_approval') {
      return { success: false, error: `Cannot approve — requirement is "${req?.status}"` }
    }

    // Same single function handles issue creation + stock deduction
    await dbIssueItemsFromRequirement(requirementId, profile.id)

    await sb.from('requirements').update({
      status: 'issued',
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
    }).eq('id', requirementId)

    await sb.from('workflow_history').insert({
      entity_type: 'requirement',
      entity_id: requirementId,
      from_status: 'pending_approval' as any,
      to_status: 'issued' as any,
      event: 'approve_release' as any,
      actor_id: profile.id,
      comment: comment ?? null,
    })

    revalidateAll(requirementId)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/**
 * PM approves a to_order or to_enquire_price requirement.
 * For to_order: caller navigates to PO creation after this.
 * Requirement → approved.
 */
export async function approveForProcurement(
  requirementId: string,
  comment?: string,
) {
  try {
    const { profile, role } = await getServerSession()
    if (!can(role, 'requirement', 'update')) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const sb = await createClient()
    const { data: req } = await sb
      .from('requirements')
      .select('id, status, request_type')
      .eq('id', requirementId)
      .single()

    if (!req || req.status !== 'submitted') {
      return { success: false, error: 'Requirement not in submitted state' }
    }

    await sb.from('requirements').update({
      status: 'approved',
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
      procurement_decision_status: req.request_type,
      procurement_decision_made_at: new Date().toISOString(),
      procurement_decision_made_by: profile.id,
    }).eq('id', requirementId)

    await sb.from('workflow_history').insert({
      entity_type: 'requirement',
      entity_id: requirementId,
      from_status: 'submitted' as any,
      to_status: 'approved' as any,
      event: 'approve' as any,
      actor_id: profile.id,
      comment: comment ?? null,
      metadata: { request_type: req.request_type },
    })

    revalidateAll(requirementId)
    return { success: true, request_type: req.request_type }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/**
 * PM or approver declines a requirement.
 * Works from both 'submitted' and 'pending_approval' states.
 * Requirement → rejected; requester can revise and resubmit.
 */
export async function declineRequirement(
  requirementId: string,
  reason: string,
) {
  try {
    const { profile, role } = await getServerSession()
    if (!can(role, 'requirement', 'update')) {
      return { success: false, error: 'Insufficient permissions' }
    }
    if (!reason?.trim()) {
      return { success: false, error: 'A reason is required when declining' }
    }

    const sb = await createClient()
    const { data: req } = await sb
      .from('requirements')
      .select('id, status')
      .eq('id', requirementId)
      .single()

    if (!req) return { success: false, error: 'Requirement not found' }
    if (!['submitted', 'pending_approval'].includes(req.status)) {
      return { success: false, error: `Cannot decline — requirement is "${req.status}"` }
    }

    await sb.from('requirements').update({
      status: 'rejected',
      rejection_reason: reason,
    }).eq('id', requirementId)

    await sb.from('workflow_history').insert({
      entity_type: 'requirement',
      entity_id: requirementId,
      from_status: req.status as any,
      to_status: 'rejected' as any,
      event: 'reject' as any,
      actor_id: profile.id,
      comment: reason,
    })

    revalidateAll(requirementId)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
