'use server'
import { createClient } from '@/lib/supabase/server'
import type { CreateIssueInput, UsageOutcomeInput } from '@/lib/validations/issue'

/**
 * Sum all transaction quantities for a PIN to get current stock level.
 */
async function getCurrentStock(sb: any, pinId: string): Promise<number> {
  const { data } = await sb
    .from('inventory_transactions')
    .select('quantity')
    .eq('pin_id', pinId)
  return (data ?? []).reduce(
    (sum: number, t: any) => sum + (t.quantity ?? 0),
    0
  )
}

/**
 * Create a material issue in draft state.
 */
export async function dbCreateIssue(
  input: CreateIssueInput,
  operatorId: string
) {
  const sb = await createClient()

  const { data, error } = await sb
    .from('material_issues')
    .insert({
      pin_id: input.pin_id,
      issued_to: input.issued_to,
      vessel_id: input.vessel_id ?? null,
      work_order: input.work_order ?? null,
      quantity: input.quantity,
      unit: input.unit,
      purpose: input.purpose,
      expected_return_date: input.expected_return_date ?? null,
      status: 'draft',
      quantity_returned: 0,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/**
 * Submit a draft issue for approval.
 */
export async function dbSubmitIssue(
  issueId: string,
  operatorId: string
): Promise<void> {
  const sb = await createClient()

  const { error } = await sb
    .from('material_issues')
    .update({ status: 'pending_approval' })
    .eq('id', issueId)
  if (error) throw new Error(error.message)

  await sb.from('workflow_history').insert({
    entity_type: 'issue',
    entity_id: issueId,
    from_status: 'draft',
    to_status: 'pending_approval',
    event: 'submit',
    actor_id: operatorId,
  })
}

/**
 * Approve a pending issue.
 */
export async function dbApproveIssue(
  issueId: string,
  operatorId: string,
  comment?: string
): Promise<void> {
  const sb = await createClient()

  const { error } = await sb
    .from('material_issues')
    .update({
      status: 'approved',
      approved_by: operatorId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', issueId)
  if (error) throw new Error(error.message)

  await sb.from('workflow_history').insert({
    entity_type: 'issue',
    entity_id: issueId,
    from_status: 'pending_approval',
    to_status: 'approved',
    event: 'approve',
    actor_id: operatorId,
    comment: comment ?? null,
  })
}

/**
 * Physically issue approved material: deduct stock and update issue status.
 */
export async function dbIssueMaterial(
  issueId: string,
  operatorId: string
) {
  const sb = await createClient()

  const { data: issue } = await sb
    .from('material_issues')
    .select('*')
    .eq('id', issueId)
    .single() as any
  if (!issue) throw new Error('Issue not found')
  if (issue.status !== 'approved')
    throw new Error('Issue must be approved before issuing')

  const currentStock = await getCurrentStock(sb, issue.pin_id)
  if (currentStock < issue.quantity)
    throw new Error(
      `Insufficient stock: available ${currentStock}, requested ${issue.quantity}`
    )

  const newStock = currentStock - issue.quantity

  // Record issue transaction (negative quantity = stock out)
  const { error: txErr } = await sb.from('inventory_transactions').insert({
    pin_id: issue.pin_id,
    transaction_type: 'issue',
    quantity: -issue.quantity,
    quantity_before: currentStock,
    quantity_after: newStock,
    reference_type: 'issue',
    reference_id: issueId,
    notes: `Issued to ${issue.issued_to} — ${issue.purpose ?? ''}`,
    actor_id: operatorId,
  })
  if (txErr) throw new Error(txErr.message)

  // Update issue status
  const { error: iErr } = await sb
    .from('material_issues')
    .update({
      status: 'issued',
      issued_by: operatorId,
      issued_at: new Date().toISOString(),
    })
    .eq('id', issueId)
  if (iErr) throw new Error(iErr.message)

  await sb.from('workflow_history').insert({
    entity_type: 'issue',
    entity_id: issueId,
    from_status: 'approved',
    to_status: 'issued',
    event: 'issue_material',
    actor_id: operatorId,
  })

  return { previous_stock: currentStock, new_stock: newStock }
}

/**
 * Capture what happened to the issued material after use.
 * Handles scrap write-off and leftover/not_used returns to stock.
 */
export async function dbCaptureUsageOutcome(
  input: UsageOutcomeInput,
  operatorId: string
) {
  const sb = await createClient()

  const { data: issue } = await sb
    .from('material_issues')
    .select('*')
    .eq('id', input.issue_id)
    .single() as any
  if (!issue) throw new Error('Issue not found')

  // Update issue with outcome metadata
  const { error: outcomeErr } = await sb
    .from('material_issues')
    .update({
      usage_outcome: input.outcome,
      outcome_notes: input.outcome_notes ?? null,
      outcome_captured_at: new Date().toISOString(),
    })
    .eq('id', input.issue_id)
  if (outcomeErr) throw new Error(outcomeErr.message)

  if (input.outcome === 'scrap') {
    // Write off scrapped quantity
    const qty = input.quantity_scrapped ?? issue.quantity
    const currentStock = await getCurrentStock(sb, issue.pin_id)

    const { error: txErr } = await sb.from('inventory_transactions').insert({
      pin_id: issue.pin_id,
      transaction_type: 'write_off',
      quantity: -qty,
      quantity_before: currentStock,
      quantity_after: currentStock - qty,
      reference_type: 'issue',
      reference_id: issue.id,
      notes: `Scrapped from issue ${issue.issue_number}: ${input.outcome_notes ?? ''}`,
      actor_id: operatorId,
    })
    if (txErr) throw new Error(txErr.message)

    await sb
      .from('material_issues')
      .update({ status: 'closed' })
      .eq('id', issue.id)
  } else if (input.outcome === 'not_used' || input.outcome === 'leftover') {
    // Return unused material to stock
    const qtyReturning = input.quantity_returning ?? issue.quantity
    const currentStock = await getCurrentStock(sb, issue.pin_id)

    const { error: txErr } = await sb.from('inventory_transactions').insert({
      pin_id: issue.pin_id,
      transaction_type: 'return',
      quantity: qtyReturning,
      quantity_before: currentStock,
      quantity_after: currentStock + qtyReturning,
      reference_type: 'issue',
      reference_id: issue.id,
      notes: `Return from issue ${issue.issue_number} — outcome: ${input.outcome}`,
      actor_id: operatorId,
    })
    if (txErr) throw new Error(txErr.message)

    const newStatus =
      qtyReturning >= issue.quantity ? 'fully_returned' : 'partially_returned'

    const { error: statusErr } = await sb
      .from('material_issues')
      .update({
        quantity_returned: qtyReturning,
        status: newStatus,
      })
      .eq('id', issue.id)
    if (statusErr) throw new Error(statusErr.message)
  }

  return { outcome: input.outcome }
}

/**
 * Reject a pending issue.
 */
export async function dbRejectIssue(
  issueId: string,
  operatorId: string,
  comment?: string
): Promise<void> {
  const sb = await createClient()

  const { error } = await sb
    .from('material_issues')
    .update({ status: 'rejected' })
    .eq('id', issueId)
  if (error) throw new Error(error.message)

  await sb.from('workflow_history').insert({
    entity_type: 'issue',
    entity_id: issueId,
    from_status: 'pending_approval',
    to_status: 'rejected',
    event: 'reject',
    actor_id: operatorId,
    comment: comment ?? null,
  })
}
