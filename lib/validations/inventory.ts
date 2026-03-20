import { z } from 'zod'

export const IntakeItemSchema = z.object({
  delivery_item_id: z.string().uuid(),
  description: z.string().min(2),
  part_number: z.string().optional(),
  category: z.string().min(1, 'Category required'),
  unit: z.string().min(1),
  quantity: z.coerce.number().positive('Must be > 0'),
  location_id: z.string().uuid('Select a location'),
  unit_cost: z.coerce.number().nonnegative().optional(),
  origin_reference: z.string().optional(),
})

export const IntakeDeliverySchema = z.object({
  delivery_id: z.string().uuid(),
  inspection_id: z.string().uuid(),
  items: z.array(IntakeItemSchema).min(1),
})

export const AdjustStockSchema = z.object({
  pin_id: z.string().uuid(),
  quantity: z.coerce.number().refine(n => n !== 0, 'Must not be zero'),
  reason: z.string().min(2),
  location_id: z.string().uuid().optional(),
  unit_cost: z.coerce.number().nonnegative().optional(),
})

export const TransferPinSchema = z.object({
  pin_id: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  from_location_id: z.string().uuid(),
  to_location_id: z.string().uuid(),
  notes: z.string().optional(),
})

export type IntakeDeliveryInput = z.infer<typeof IntakeDeliverySchema>
export type IntakeItemInput = z.infer<typeof IntakeItemSchema>
export type AdjustStockInput = z.infer<typeof AdjustStockSchema>
export type TransferPinInput = z.infer<typeof TransferPinSchema>
