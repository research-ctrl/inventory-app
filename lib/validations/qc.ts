import { z } from 'zod'

export const QCItemResultSchema = z.object({
  delivery_item_id: z.string().uuid(),
  description: z.string(),
  quantity_expected: z.coerce.number().positive(),
  accepted_qty: z.coerce.number().min(0),
  rejected_qty: z.coerce.number().min(0),
  defects: z.array(z.object({
    defect_code: z.string().optional(),
    description: z.string().min(2),
    severity: z.enum(['minor', 'major', 'critical']),
    quantity_affected: z.coerce.number().positive().optional(),
    disposition: z.enum(['return_to_vendor', 'scrap', 'accept_on_deviation', 'rework']),
  })).default([]),
})

export const StartInspectionSchema = z.object({
  delivery_id: z.string().uuid(),
  remarks: z.string().optional(),
  pass_criteria: z.string().optional(),
})

export const SubmitInspectionSchema = z.object({
  inspection_id: z.string().uuid(),
  items: z.array(QCItemResultSchema).min(1),
  overall_remarks: z.string().optional(),
})
// result is computed: if all accepted → pass; if all rejected → fail; else conditional

export const QCReturnSchema = z.object({
  inspection_id: z.string().uuid(),
  delivery_id: z.string().uuid(),
  vendor_id: z.string().uuid().optional(),
  po_id: z.string().uuid().optional(),
  quantity_returned: z.coerce.number().positive(),
  return_reason: z.string().min(2),
  return_notes: z.string().optional(),
  replacement_expected: z.string().optional().nullable(),
})

export type StartInspectionInput = z.infer<typeof StartInspectionSchema>
export type SubmitInspectionInput = z.infer<typeof SubmitInspectionSchema>
export type QCItemResultInput = z.infer<typeof QCItemResultSchema>
export type QCReturnInput = z.infer<typeof QCReturnSchema>
