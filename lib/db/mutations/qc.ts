'use server'
import { createClient } from '@/lib/supabase/server'
import type { SubmitInspectionInput } from '@/lib/validations/qc'

/**
 * Create a new QC inspection record for a delivery (in_progress state).
 */
export async function dbStartInspection(
  deliveryId: string,
  remarks: string | undefined,
  passCriteria: string | undefined,
  operatorId: string
) {
  const sb = await createClient()

  const { data, error } = await sb
    .from('qc_inspections')
    .insert({
      delivery_id: deliveryId,
      inspector_id: operatorId,
      status: 'qc_pending',
      remarks: remarks ?? null,
      pass_criteria: passCriteria ?? null,
      inspection_date: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/**
 * Submit item-level results, compute overall pass/fail/conditional,
 * insert defects, and update delivery status accordingly.
 */
export async function dbSubmitInspectionResult(
  input: SubmitInspectionInput,
  operatorId: string
) {
  const sb = await createClient()

  // Compute overall result from items
  const totalAccepted = input.items.reduce((s, i) => s + i.accepted_qty, 0)
  const totalRejected = input.items.reduce((s, i) => s + i.rejected_qty, 0)

  let result: 'pass' | 'fail' | 'conditional'
  if (totalRejected === 0) result = 'pass'
  else if (totalAccepted === 0) result = 'fail'
  else result = 'conditional'

  // Determine delivery status
  const deliveryStatus =
    result === 'pass' ? 'qc_passed' : result === 'fail' ? 'qc_failed' : 'qc_conditional'

  // Update inspection record
  const { data: inspection, error: iErr } = await sb
    .from('qc_inspections')
    .update({
      result,
      status: deliveryStatus,
      accepted_qty: totalAccepted,
      rejected_qty: totalRejected,
      remarks: input.overall_remarks ?? null,
    })
    .eq('id', input.inspection_id)
    .select()
    .single()
  if (iErr) throw new Error(iErr.message)

  // Insert defects for each item that has them
  const defectRows: any[] = []
  for (const item of input.items) {
    for (const defect of item.defects) {
      defectRows.push({
        inspection_id: input.inspection_id,
        defect_code: defect.defect_code ?? null,
        description: defect.description,
        severity: defect.severity,
        quantity_affected: defect.quantity_affected ?? item.rejected_qty,
        disposition: defect.disposition,
      })
    }
  }
  if (defectRows.length > 0) {
    const { error: defErr } = await sb.from('qc_defects').insert(defectRows)
    if (defErr) throw new Error(`qc_defects insert: ${defErr.message}`)
  }

  // Fetch delivery_id from the inspection record
  const { data: inspectionRow } = await sb
    .from('qc_inspections')
    .select('delivery_id')
    .eq('id', input.inspection_id)
    .single() as any

  if (inspectionRow?.delivery_id) {
    await sb
      .from('deliveries')
      .update({ status: deliveryStatus })
      .eq('id', inspectionRow.delivery_id)

    await sb.from('workflow_history').insert({
      entity_type: 'delivery',
      entity_id: inspectionRow.delivery_id,
      from_status: 'qc_pending',
      to_status: deliveryStatus,
      event:
        result === 'pass'
          ? 'pass_inspection'
          : result === 'fail'
          ? 'fail_inspection'
          : 'conditional_inspection',
      actor_id: operatorId,
    })
  }

  return { inspection, result, totalAccepted, totalRejected }
}

/**
 * Create a QC return record for rejected goods that need to go back to vendor.
 */
export async function dbCreateQCReturn(
  returnData: {
    inspection_id: string
    delivery_id: string
    vendor_id?: string
    po_id?: string
    quantity_returned: number
    return_reason: string
    return_notes?: string
    replacement_expected?: string | null
  },
  operatorId: string
) {
  const sb = await createClient()
  const returnRef = `QCRET-${Date.now()}`

  const { data, error } = await sb
    .from('qc_returns')
    .insert({
      ...returnData,
      vendor_id: returnData.vendor_id ?? null,
      po_id: returnData.po_id ?? null,
      return_notes: returnData.return_notes ?? null,
      replacement_expected: returnData.replacement_expected ?? null,
      return_ref: returnRef,
      status: 'pending',
      created_by: operatorId,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/**
 * Advance a QC return through its status lifecycle.
 */
export async function dbUpdateQCReturnStatus(
  returnId: string,
  status: string,
  replacementDeliveryId?: string,
  operatorId?: string
): Promise<void> {
  const sb = await createClient()

  const { error } = await sb
    .from('qc_returns')
    .update({
      status,
      ...(replacementDeliveryId ? { replacement_delivery_id: replacementDeliveryId } : {}),
      ...(status === 'shipped_to_vendor' ? { returned_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', returnId)

  if (error) throw new Error(error.message)
}
