import { z } from 'zod'

export const DeliveryItemSchema = z.object({
  id: z.string().uuid().optional(),
  po_item_id: z.string().uuid().optional().nullable(),
  line_number: z.number().int().positive(),
  description: z.string().min(2),
  part_number: z.string().optional(),
  quantity_expected: z.coerce.number().positive(),
  quantity_received: z.coerce.number().nonnegative(),
  unit: z.string().min(1),
  condition_notes: z.string().optional(),
})

export const CreateDeliverySchema = z.object({
  po_id: z.string().uuid('Select a PO'),
  delivery_ref: z.string().optional(),
  supplier_delivery_note: z.string().optional(),
  tracking_number: z.string().optional(),
  carrier: z.string().optional(),
  expected_date: z.string().optional().nullable(),
  receiving_location_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional(),
  items: z.array(DeliveryItemSchema).min(1, 'At least one item required'),
})

export type CreateDeliveryInput = z.infer<typeof CreateDeliverySchema>
export type DeliveryItemInput = z.infer<typeof DeliveryItemSchema>
