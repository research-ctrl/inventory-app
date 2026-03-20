import { createClient } from '@/lib/supabase/server'

export type QCQueueRow = {
  id: string
  delivery_ref: string
  status: string
  created_at: string
  po: {
    po_number: string
    vendor: {
      name: string
    }
  } | null
}

export type QCInspection = {
  id: string
  inspection_ref: string | null
  delivery_id: string
  delivery_item_id: string | null
  inspector_id: string
  result: 'pass' | 'fail' | 'conditional' | null
  status: string | null
  inspection_date: string | null
  pass_criteria: string | null
  remarks: string | null
  documents: unknown
  accepted_qty: number | null
  rejected_qty: number | null
}

export type QCReturn = {
  id: string
  return_ref: string
  inspection_id: string
  delivery_id: string
  vendor_id: string | null
  po_id: string | null
  quantity_returned: number
  return_reason: string
  status: string
  return_notes: string | null
  replacement_delivery_id: string | null
  returned_at: string | null
  replacement_expected: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * All deliveries that need QC (status = qc_pending or qc_conditional)
 */
export async function getQCQueue(): Promise<QCQueueRow[]> {
  const sb = await createClient()

  const { data, error } = await sb
    .from('deliveries')
    .select(
      `id,
       delivery_ref,
       status,
       created_at,
       po:purchase_orders(
         po_number,
         vendor:vendors(name)
       )`
    )
    .in('status', ['qc_pending', 'qc_conditional'])
    .order('created_at', { ascending: true })

  if (error) throw new Error(`getQCQueue: ${error.message}`)
  return (data ?? []) as unknown as QCQueueRow[]
}

/**
 * Returns inspections with delivery and inspector relations
 */
export async function getQCInspections(filters?: {
  delivery_id?: string
  result?: string
  status?: string
}): Promise<QCInspection[]> {
  const sb = await createClient()

  let query = sb
    .from('qc_inspections')
    .select(
      `*,
       delivery:deliveries(
         id,
         delivery_ref,
         status,
         po:purchase_orders(
           po_number,
           vendor:vendors(name)
         )
       ),
       inspector:profiles(id, full_name, email)`
    )
    .order('created_at', { ascending: false })

  if (filters?.delivery_id) {
    query = query.eq('delivery_id', filters.delivery_id)
  }
  if (filters?.result) {
    query = query.eq('result', filters.result)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) throw new Error(`getQCInspections: ${error.message}`)
  return (data ?? []) as unknown as QCInspection[]
}

/**
 * Full inspection with: delivery (with po and vendor), delivery_item,
 * inspector profile, defects, delivery_items (all items for this delivery)
 */
export async function getQCInspectionById(id: string) {
  const sb = await createClient()

  const { data, error } = await sb
    .from('qc_inspections')
    .select(
      `*,
       delivery:deliveries(
         id,
         delivery_ref,
         status,
         actual_received_date,
         notes,
         po:purchase_orders(
           id,
           po_number,
           vendor:vendors(id, name, code)
         ),
         delivery_items(
           id,
           line_number,
           description,
           part_number,
           quantity_expected,
           quantity_received,
           unit,
           condition_notes
         )
       ),
       delivery_item:delivery_items(
         id,
         line_number,
         description,
         part_number,
         quantity_expected,
         quantity_received,
         unit,
         condition_notes
       ),
       inspector:profiles(id, full_name, email, role, department),
       defects:qc_defects(
         id,
         defect_code,
         description,
         severity,
         quantity_affected,
         disposition
       )`
    )
    .eq('id', id)
    .single()

  if (error) throw new Error(`getQCInspectionById: ${error.message}`)
  return data as unknown as Record<string, unknown>
}

/**
 * From qc_returns table with inspection and delivery joins
 */
export async function getQCReturns(filters?: { status?: string }): Promise<QCReturn[]> {
  const sb = await createClient()

  let query = sb
    .from('qc_returns')
    .select(
      `*,
       inspection:qc_inspections(
         id,
         inspection_ref,
         result,
         status,
         accepted_qty,
         rejected_qty
       ),
       delivery:deliveries(
         id,
         delivery_ref,
         status
       ),
       vendor:vendors(id, name, code),
       created_by_profile:profiles(id, full_name)`
    )
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) throw new Error(`getQCReturns: ${error.message}`)
  return (data ?? []) as unknown as QCReturn[]
}
