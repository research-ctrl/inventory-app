'use server'
import { createClient } from '@/lib/supabase/server'
import type { CreateRecoveryInput, AssessRecoveryInput } from '@/lib/validations/recovery'

/**
 * Record a return of material from an issue.
 * Creates a recovery record in 'pending_assessment' state.
 */
export async function dbCreateRecovery(
  input: CreateRecoveryInput,
  operatorId: string
) {
  const sb = await createClient()

  // 1. Create recovery record
  const { data: recovery, error: recErr } = await sb
    .from('recoveries')
    .insert({
      issue_id: input.issue_id,
      pin_id: input.pin_id,
      quantity_returned: input.quantity_returned,
      condition_notes: input.condition_notes,
      recovery_location_id: input.recovery_location_id ?? null,
      status: 'pending_assessment',
    })
    .select()
    .single()

  if (recErr) throw new Error(recErr.message)

  // 2. Log workflow
  await sb.from('workflow_history').insert({
    entity_type: 'recovery',
    entity_id: recovery.id,
    to_status: 'pending_assessment',
    event: 'create',
    actor_id: operatorId,
    comment: input.condition_notes,
  })

  // 3. Update material_issue with returned quantity
  const { data: issue } = await sb
    .from('material_issues')
    .select('quantity_returned, quantity')
    .eq('id', input.issue_id)
    .single() as any

  if (issue) {
    const totalReturned = (issue.quantity_returned ?? 0) + input.quantity_returned
    const status = totalReturned >= issue.quantity ? 'fully_returned' : 'partially_returned'

    await sb
      .from('material_issues')
      .update({
        quantity_returned: totalReturned,
        status: status,
      })
      .eq('id', input.issue_id)
  }

  return recovery
}

/**
 * Assess a recovery record and pick a disposition.
 * - reuse (A/B): Return to stock.
 * - repair (C): Flag PIN as on-hold/repair.
 * - scrap (D/scrap): Write off.
 */
export async function dbAssessRecovery(
  input: AssessRecoveryInput,
  operatorId: string
) {
  const sb = await createClient()

  const { data: recovery } = await sb
    .from('recoveries')
    .select('*, pin:inventory_pins(*)')
    .eq('id', input.recovery_id)
    .single() as any

  if (!recovery) throw new Error('Recovery record not found')

  // A. Update recovery status and assessment
  const { error: updErr } = await sb
    .from('recoveries')
    .update({
      condition_grade: input.condition_grade,
      condition_notes: input.condition_notes,
      outcome: input.outcome,
      disposition_notes: input.disposition_notes,
      status: 'closed',
      assessed_by: operatorId,
      assessed_at: new Date().toISOString(),
    })
    .eq('id', input.recovery_id)

  if (updErr) throw new Error(updErr.message)

  // B. Logic based on outcome
  if (input.outcome === 'reuse' && (input.condition_grade === 'A' || input.condition_grade === 'B')) {
    // Return to stock: Positive transaction
    const { error: txErr } = await sb.from('inventory_transactions').insert({
      pin_id: recovery.pin_id,
      transaction_type: 'return',
      quantity: recovery.quantity_returned,
      reference_type: 'recovery',
      reference_id: recovery.id,
      notes: `Recovered (Grade ${input.condition_grade}) — ${input.disposition_notes ?? ''}`,
      actor_id: operatorId,
    })
    if (txErr) throw new Error(txErr.message)
  }
  else if (input.outcome === 'repair' || input.condition_grade === 'C') {
    // Send for repair: Flag PIN as on_hold or similar if needed.
    // For now, we'll just log it in the recovery record.
    // Business requirement: "item quarantined, PIN flagged, no stock addition yet."
    await sb.from('inventory_pins')
      .update({ status: 'on_hold' })
      .eq('id', recovery.pin_id)
  }
  else if (input.outcome === 'scrap' || input.condition_grade === 'scrap' || input.condition_grade === 'D') {
    // Write off: log in scrap_logs and do negative transaction (if it was ever added back, but here it's not)
    // Actually if it's scrapped AFTER return, it never entered stock, so we just log it.
    await sb.from('scrap_logs').insert({
      pin_id: recovery.pin_id,
      issue_id: recovery.issue_id,
      recovery_id: recovery.id,
      quantity: recovery.quantity_returned,
      unit: recovery.pin.unit,
      reason: input.disposition_notes || `Scrapped (Grade ${input.condition_grade})`,
      actor_id: operatorId,
    })
  }

  // C. Log workflow
  await sb.from('workflow_history').insert({
    entity_type: 'recovery',
    entity_id: recovery.id,
    from_status: 'pending_assessment',
    to_status: 'closed',
    event: 'assess',
    actor_id: operatorId,
    comment: input.disposition_notes,
    metadata: { outcome: input.outcome, grade: input.condition_grade },
  })

  return { success: true }
}
