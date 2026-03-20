'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createQCInspection, startInspection, submitInspectionResult } from '@/lib/db/mutations/qc'
import { createPIN, recordTransaction } from '@/lib/db/mutations/inventory'
import { approveIssue, createIssue, issueToVessel, submitIssue } from '@/lib/db/mutations/issues'
import { createRecovery } from '@/lib/db/mutations/recovery'
import { formatOperatorLabel, parsePrototypeOperator, resolvePrototypeActorId } from '@/lib/prototype/operator'

function asString(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function asNumber(value: FormDataEntryValue | null) {
  const parsed = Number(typeof value === 'string' ? value : '')
  return Number.isFinite(parsed) ? parsed : 0
}

async function writeAudit(input: {
  actorId: string
  action: string
  entityType: string
  entityId?: string
  newData: Record<string, unknown>
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('audit_log').insert({
    actor_id: input.actorId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    new_data: input.newData,
  })
  if (error) throw new Error(error.message)
}

export async function recordQcDisposition(formData: FormData) {
  try {
    const supabase = await createClient()
    const operator = parsePrototypeOperator(formData)
    const actorId = await resolvePrototypeActorId('qc_inspector')
    const deliveryId = asString(formData.get('deliveryId'))
    const deliveryItemId = asString(formData.get('deliveryItemId')) || undefined
    const result = asString(formData.get('result')) as 'pass' | 'partial_pass' | 'fail'
    const acceptedQty = asNumber(formData.get('acceptedQty'))
    const rejectedQty = asNumber(formData.get('rejectedQty'))
    const receivedQty = asNumber(formData.get('receivedQty'))
    const remarks = asString(formData.get('remarks'))
    const category = asString(formData.get('category'))
    const phase = asString(formData.get('phase'))
    const unit = asString(formData.get('unit')) || 'EA'
    const description = asString(formData.get('description'))
    const partNumber = asString(formData.get('partNumber')) || null
    const replacementRequired = asString(formData.get('replacementRequired')) === 'yes'

    if (!deliveryId) throw new Error('Delivery is required.')
    if (!['pass', 'partial_pass', 'fail'].includes(result)) throw new Error('Invalid QC result.')
    if (acceptedQty < 0 || rejectedQty < 0) throw new Error('Quantities cannot be negative.')
    if (acceptedQty + rejectedQty !== receivedQty) {
      throw new Error('Accepted quantity plus rejected quantity must match received quantity exactly.')
    }
    if ((result === 'pass' && rejectedQty !== 0) || (result === 'fail' && acceptedQty !== 0)) {
      throw new Error('Pass/fail quantities must match the selected QC outcome.')
    }

    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .select('id, delivery_ref, status')
      .eq('id', deliveryId)
      .single()

    if (deliveryError || !delivery) throw new Error(deliveryError?.message ?? 'Delivery not found.')

    const inspection = await createQCInspection({
      delivery_id: deliveryId,
      delivery_item_id: deliveryItemId,
      inspector_id: actorId,
      pass_criteria: `Prototype disposition captured by ${formatOperatorLabel(operator) || 'operator'}`,
    })

    await startInspection(inspection.id, actorId)

    const mappedResult = result === 'partial_pass' ? 'conditional' : result
    await submitInspectionResult(
      inspection.id,
      actorId,
      mappedResult as 'pass' | 'fail' | 'conditional',
      remarks || undefined,
      rejectedQty > 0
        ? [
            {
              description: remarks || 'Rejected material awaiting vendor disposition.',
              severity: result === 'fail' ? 'major' : 'minor',
              quantity_affected: rejectedQty,
              disposition: 'return_to_vendor',
            },
          ]
        : undefined,
    )

    const deliveryStatus = result === 'pass' ? 'qc_passed' : result === 'fail' ? 'qc_failed' : 'qc_conditional'
    const { error: statusError } = await supabase
      .from('deliveries')
      .update({ status: deliveryStatus })
      .eq('id', deliveryId)

    if (statusError) throw new Error(statusError.message)

    await supabase.from('workflow_history').insert({
      entity_type: 'delivery',
      entity_id: deliveryId,
      from_status: delivery.status,
      to_status: deliveryStatus,
      event: mappedResult === 'pass' ? 'pass_inspection' : mappedResult === 'fail' ? 'fail_inspection' : 'conditional_inspection',
      actor_id: actorId,
      comment: remarks || `QC recorded by ${formatOperatorLabel(operator)}`,
      metadata: {
        accepted_qty: acceptedQty,
        rejected_qty: rejectedQty,
        phase,
        category,
      },
    })

    await writeAudit({
      actorId,
      action: 'prototype_qc_disposition',
      entityType: 'delivery',
      entityId: deliveryId,
      newData: {
        delivery_ref: delivery.delivery_ref,
        inspection_id: inspection.id,
        result,
        accepted_qty: acceptedQty,
        rejected_qty: rejectedQty,
        received_qty: receivedQty,
        category,
        phase,
        unit,
        description,
        part_number: partNumber,
        intake_status: acceptedQty > 0 ? 'pending' : 'not_required',
        vendor_return_required: rejectedQty > 0,
        replacement_required: replacementRequired,
        operator_name: operator.name,
        operator_team: operator.team,
      },
    })

    if (rejectedQty > 0) {
      await writeAudit({
        actorId,
        action: 'prototype_vendor_return',
        entityType: 'delivery',
        entityId: deliveryId,
        newData: {
          delivery_ref: delivery.delivery_ref,
          result,
          rejected_qty: rejectedQty,
          return_status: 'return_authorized',
          replacement_status: replacementRequired ? 'awaiting_replacement_delivery' : 'not_requested',
          loop_back_target: replacementRequired ? 'receiving' : null,
          notes: remarks,
          operator_name: operator.name,
          operator_team: operator.team,
        },
      })

      await supabase.from('workflow_history').insert({
        entity_type: 'delivery',
        entity_id: deliveryId,
        from_status: deliveryStatus,
        to_status: deliveryStatus,
        event: 'initiate_return',
        actor_id: actorId,
        comment: replacementRequired
          ? `Vendor return raised with replacement loop back to delivery tracking by ${formatOperatorLabel(operator)}`
          : `Vendor return raised by ${formatOperatorLabel(operator)}`,
        metadata: {
          rejected_qty: rejectedQty,
          replacement_required: replacementRequired,
        },
      })
    }

    revalidatePath('/qc')
    revalidatePath('/qc/returns')
    revalidatePath('/inventory')
    revalidatePath('/receiving')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function processInventoryIntake(formData: FormData) {
  try {
    const supabase = await createClient()
    const operator = parsePrototypeOperator(formData)
    const actorId = await resolvePrototypeActorId('store_keeper')
    const deliveryId = asString(formData.get('deliveryId'))
    const acceptedQty = asNumber(formData.get('acceptedQty'))
    const description = asString(formData.get('description'))
    const partNumber = asString(formData.get('partNumber')) || undefined
    const category = asString(formData.get('category')) || 'Uncategorised'
    const phase = asString(formData.get('phase')) || 'ready_for_issue'
    const unit = asString(formData.get('unit')) || 'EA'
    const locationId = asString(formData.get('locationId'))
    const minStockLevel = asNumber(formData.get('minStockLevel'))
    const maxStockLevel = asNumber(formData.get('maxStockLevel')) || undefined

    if (!deliveryId || !locationId) throw new Error('Delivery and intake location are required.')
    if (acceptedQty <= 0) throw new Error('Accepted quantity must be greater than zero.')

    const [{ data: delivery, error: deliveryError }, { data: vendorReturnLogs }] = await Promise.all([
      supabase
        .from('deliveries')
        .select('id, delivery_ref, status')
        .eq('id', deliveryId)
        .single(),
      supabase
        .from('audit_log')
        .select('new_data, created_at')
        .eq('entity_type', 'delivery')
        .eq('entity_id', deliveryId)
        .eq('action', 'prototype_vendor_return')
        .order('created_at', { ascending: false })
        .limit(1),
    ])

    if (deliveryError || !delivery) throw new Error(deliveryError?.message ?? 'Delivery not found.')
    const latestVendorReturn = vendorReturnLogs?.[0]?.new_data as { replacement_status?: string } | undefined

    const pin = await createPIN({
      description,
      part_number: partNumber,
      category,
      unit,
      location_id: locationId,
      min_stock_level: minStockLevel,
      max_stock_level: maxStockLevel,
      origin_type: 'procurement',
      origin_reference: delivery.delivery_ref,
    })

    await recordTransaction({
      pin_id: pin.id,
      transaction_type: 'receipt',
      quantity: acceptedQty,
      reference_type: 'delivery',
      reference_id: deliveryId,
      location_id: locationId,
      actor_id: actorId,
      notes: `Inventory intake for ${delivery.delivery_ref} (${phase}) by ${formatOperatorLabel(operator)}`,
    })

    const nextDeliveryStatus = latestVendorReturn?.replacement_status === 'awaiting_replacement_delivery' ? 'partially_delivered' : 'closed'

    await supabase.from('workflow_history').insert({
      entity_type: 'delivery',
      entity_id: deliveryId,
      from_status: delivery.status,
      to_status: nextDeliveryStatus,
      event: 'accept_into_inventory',
      actor_id: actorId,
      comment: `Accepted into inventory under ${pin.pin_number}`,
      metadata: {
        pin_id: pin.id,
        pin_number: pin.pin_number,
        phase,
        category,
        quantity: acceptedQty,
      },
    })

    await supabase.from('deliveries').update({ status: nextDeliveryStatus }).eq('id', deliveryId)

    await writeAudit({
      actorId,
      action: 'prototype_inventory_intake',
      entityType: 'delivery',
      entityId: deliveryId,
      newData: {
        delivery_ref: delivery.delivery_ref,
        pin_id: pin.id,
        pin_number: pin.pin_number,
        accepted_qty: acceptedQty,
        category,
        phase,
        location_id: locationId,
        intake_status: 'completed',
        next_delivery_status: nextDeliveryStatus,
        operator_name: operator.name,
        operator_team: operator.team,
      },
    })

    revalidatePath('/inventory')
    revalidatePath('/inventory/pins')
    revalidatePath('/inventory/transactions')
    revalidatePath(`/inventory/pins/${pin.id}`)
    return { success: true, pinId: pin.id }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function dispatchIssueToOperations(formData: FormData) {
  try {
    const operator = parsePrototypeOperator(formData)
    const actorId = await resolvePrototypeActorId('store_manager')
    const pinId = asString(formData.get('pinId'))
    const issuedTo = asString(formData.get('issuedTo'))
    const vesselId = asString(formData.get('vesselId')) || undefined
    const quantity = asNumber(formData.get('quantity'))
    const unit = asString(formData.get('unit')) || 'EA'
    const workOrder = asString(formData.get('workOrder')) || undefined
    const purpose = asString(formData.get('purpose')) || undefined
    const expectedReturnDate = asString(formData.get('expectedReturnDate')) || undefined

    if (!pinId || !issuedTo || quantity <= 0) throw new Error('PIN, shipbuilder operator, and quantity are required.')

    const issue = await createIssue({
      pin_id: pinId,
      issued_to: issuedTo,
      vessel_id: vesselId,
      work_order: workOrder,
      quantity,
      unit,
      purpose,
      expected_return_date: expectedReturnDate,
    })

    await submitIssue(issue.id, actorId)
    await approveIssue(issue.id, actorId, `Prototype direct-dispatch approval by ${formatOperatorLabel(operator)}`)
    await issueToVessel(issue.id, actorId)

    await writeAudit({
      actorId,
      action: 'prototype_issue_dispatch',
      entityType: 'material_issue',
      entityId: issue.id,
      newData: {
        issue_number: issue.issue_number,
        pin_id: pinId,
        issued_to: issuedTo,
        vessel_id: vesselId,
        quantity,
        unit,
        operator_name: operator.name,
        operator_team: operator.team,
      },
    })

    revalidatePath('/issues')
    revalidatePath('/inventory')
    revalidatePath('/inventory/transactions')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function captureUsageOutcome(formData: FormData) {
  try {
    const supabase = await createClient()
    const operator = parsePrototypeOperator(formData)
    const actorId = await resolvePrototypeActorId('shipbuilder')
    const issueId = asString(formData.get('issueId'))
    const pinId = asString(formData.get('pinId'))
    const notUsedQty = asNumber(formData.get('notUsedQty'))
    const leftoverQty = asNumber(formData.get('leftoverQty'))
    const scrapQty = asNumber(formData.get('scrapQty'))
    const recoveryLocationId = asString(formData.get('recoveryLocationId')) || undefined
    const notes = asString(formData.get('notes'))

    const totalCaptured = notUsedQty + leftoverQty + scrapQty
    if (!issueId || !pinId || totalCaptured <= 0) throw new Error('Issue, PIN, and at least one outcome quantity are required.')

    const { data: issue, error: issueError } = await supabase
      .from('material_issues')
      .select('id, issue_number, quantity, quantity_returned, status')
      .eq('id', issueId)
      .single()

    if (issueError || !issue) throw new Error(issueError?.message ?? 'Issue not found.')

    const alreadyCaptured = Number(issue.quantity_returned ?? 0)
    const outstanding = Number(issue.quantity) - alreadyCaptured
    if (totalCaptured > outstanding) throw new Error('Captured outcome exceeds the remaining issued quantity.')

    if (notUsedQty + leftoverQty > 0) {
      await createRecovery({
        issue_id: issueId,
        pin_id: pinId,
        quantity_returned: notUsedQty + leftoverQty,
        recovery_location_id: recoveryLocationId,
      })
    }

    if (scrapQty > 0) {
      const { data: scrapRecovery, error: scrapError } = await supabase
        .from('recoveries')
        .insert({
          issue_id: issueId,
          pin_id: pinId,
          quantity_returned: scrapQty,
          outcome: 'scrap',
          status: 'pending_assessment',
          recovery_location_id: recoveryLocationId,
          condition_notes: `Usage outcome captured as scrap by ${formatOperatorLabel(operator)}`,
          disposition_notes: notes || 'Captured during shipbuilder usage outcome submission.',
        })
        .select('id')
        .single()
      if (scrapError) throw new Error(scrapError.message)

      await supabase.from('workflow_history').insert({
        entity_type: 'recovery',
        entity_id: scrapRecovery.id,
        from_status: 'pending_assessment',
        to_status: 'pending_assessment',
        event: 'submit',
        actor_id: actorId,
        comment: 'Scrap captured at usage outcome stage.',
      })
    }

    const newReturned = alreadyCaptured + totalCaptured
    const newStatus = newReturned >= Number(issue.quantity) ? 'fully_returned' : 'partially_returned'
    const event = newStatus === 'fully_returned' ? 'full_return' : 'partial_return'

    await supabase
      .from('material_issues')
      .update({ quantity_returned: newReturned, status: newStatus })
      .eq('id', issueId)

    await supabase.from('workflow_history').insert({
      entity_type: 'material_issue',
      entity_id: issueId,
      from_status: issue.status,
      to_status: newStatus,
      event,
      actor_id: actorId,
      comment: notes || `Usage outcomes captured by ${formatOperatorLabel(operator)}`,
      metadata: {
        not_used_qty: notUsedQty,
        leftover_qty: leftoverQty,
        scrap_qty: scrapQty,
      },
    })

    await writeAudit({
      actorId,
      action: 'prototype_usage_outcome',
      entityType: 'material_issue',
      entityId: issueId,
      newData: {
        issue_number: issue.issue_number,
        pin_id: pinId,
        not_used_qty: notUsedQty,
        leftover_qty: leftoverQty,
        scrap_qty: scrapQty,
        recovery_location_id: recoveryLocationId,
        notes,
        operator_name: operator.name,
        operator_team: operator.team,
      },
    })

    revalidatePath('/issues')
    revalidatePath('/recovery')
    revalidatePath('/recovery/assessments')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function assessRecoveryFlow(formData: FormData) {
  try {
    const supabase = await createClient()
    const operator = parsePrototypeOperator(formData)
    const actorId = await resolvePrototypeActorId('store_manager')
    const recoveryId = asString(formData.get('recoveryId'))
    const decision = asString(formData.get('decision')) as 'reuse_existing' | 'derive_new' | 'repair_derive' | 'scrap' | 'hold'
    const conditionGrade = asString(formData.get('conditionGrade')) || 'B'
    const conditionNotes = asString(formData.get('conditionNotes'))
    const dispositionNotes = asString(formData.get('dispositionNotes'))
    const locationId = asString(formData.get('locationId'))
    const derivedDescription = asString(formData.get('derivedDescription'))
    const derivedCategory = asString(formData.get('derivedCategory')) || 'Recovered'
    const unit = asString(formData.get('unit')) || 'EA'

    const { data: recovery, error: recoveryError } = await supabase
      .from('recoveries')
      .select('id, recovery_ref, pin_id, quantity_returned, status, issue_id, outcome')
      .eq('id', recoveryId)
      .single()

    if (recoveryError || !recovery) throw new Error(recoveryError?.message ?? 'Recovery not found.')

    const baseUpdate: Record<string, unknown> = {
      condition_grade: conditionGrade,
      condition_notes: conditionNotes || null,
      disposition_notes: dispositionNotes || null,
      assessed_by: actorId,
      assessed_at: new Date().toISOString(),
    }

    let derivedPinId: string | null = null
    let finalStatus = 'assessed'
    let outcome: string | null = recovery.outcome

    if (decision === 'reuse_existing') {
      outcome = 'reuse'
      finalStatus = 'closed'
      await recordTransaction({
        pin_id: recovery.pin_id,
        transaction_type: 'return',
        quantity: Number(recovery.quantity_returned),
        reference_type: 'recovery',
        reference_id: recoveryId,
        location_id: locationId || undefined,
        actor_id: actorId,
        notes: `Recovered back to original PIN by ${formatOperatorLabel(operator)}`,
      })
    }

    if (decision === 'derive_new' || decision === 'repair_derive') {
      if (!locationId || !derivedDescription) throw new Error('Derived PIN description and location are required.')
      outcome = decision === 'repair_derive' ? 'repair' : 'reuse'
      finalStatus = decision === 'repair_derive' ? 'repaired' : 'closed'
      const pin = await createPIN({
        description: derivedDescription,
        category: derivedCategory,
        unit,
        location_id: locationId,
        origin_type: 'recovery',
        origin_reference: recovery.recovery_ref,
        parent_pin_id: recovery.pin_id,
      })
      derivedPinId = pin.id
      await recordTransaction({
        pin_id: pin.id,
        transaction_type: 'return',
        quantity: Number(recovery.quantity_returned),
        reference_type: 'recovery',
        reference_id: recoveryId,
        location_id: locationId,
        actor_id: actorId,
        notes: `Derived PIN ${pin.pin_number} created from recovery ${recovery.recovery_ref}`,
      })
    }

    if (decision === 'scrap') {
      outcome = 'scrap'
      finalStatus = 'scrapped'
    }

    if (decision === 'hold') {
      finalStatus = 'on_hold'
    }

    const { error: updateError } = await supabase
      .from('recoveries')
      .update({
        ...baseUpdate,
        outcome,
        status: finalStatus,
        derived_pin_id: derivedPinId,
        recovery_location_id: locationId || null,
        recovered_at: ['closed', 'repaired'].includes(finalStatus) ? new Date().toISOString() : null,
      })
      .eq('id', recoveryId)

    if (updateError) throw new Error(updateError.message)

    const workflowEvent =
      decision === 'scrap' ? 'scrap_material' : decision === 'hold' ? 'hold' : decision === 'repair_derive' ? 'mark_repaired' : 'mark_reuse'

    await supabase.from('workflow_history').insert({
      entity_type: 'recovery',
      entity_id: recoveryId,
      from_status: recovery.status,
      to_status: finalStatus,
      event: workflowEvent,
      actor_id: actorId,
      comment: dispositionNotes || `Recovery decision ${decision} recorded by ${formatOperatorLabel(operator)}`,
      metadata: {
        derived_pin_id: derivedPinId,
        reusable: ['reuse_existing', 'derive_new', 'repair_derive'].includes(decision),
      },
    })

    await writeAudit({
      actorId,
      action: decision === 'scrap' || decision === 'hold' ? 'prototype_scrap_hold' : 'prototype_recovery_assessment',
      entityType: 'recovery',
      entityId: recoveryId,
      newData: {
        recovery_ref: recovery.recovery_ref,
        decision,
        condition_grade: conditionGrade,
        condition_notes: conditionNotes,
        disposition_notes: dispositionNotes,
        derived_pin_id: derivedPinId,
        location_id: locationId,
        operator_name: operator.name,
        operator_team: operator.team,
      },
    })

    revalidatePath('/recovery')
    revalidatePath('/recovery/assessments')
    revalidatePath('/recovery/derived-pins')
    revalidatePath('/recovery/scrap-hold')
    revalidatePath('/inventory/pins')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
