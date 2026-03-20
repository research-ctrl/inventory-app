import { z } from 'zod'

export const PoItemSchema = z.object({
  id: z.string().uuid().optional(),
  requirement_item_id: z.string().uuid().optional().nullable(),
  line_number: z.number().int().positive(),
  description: z.string().min(2),
  part_number: z.string().optional(),
  quantity: z.coerce.number().positive('Must be > 0'),
  unit: z.string().min(1),
  unit_price: z.coerce.number().nonnegative(),
  currency: z.string().length(3).default('USD'),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  discount_rate: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional(),
})

export const CreatePurchaseOrderSchema = z.object({
  requirement_id: z.string().uuid().optional().nullable(),
  vendor_id: z.string().uuid('Select a vendor'),
  payment_terms: z.string().optional(),
  delivery_address: z.string().optional(),
  incoterms: z.string().optional(),
  currency: z.string().length(3).default('USD'),
  expected_delivery: z.string().optional().nullable(),
  notes: z.string().optional(),
  items: z.array(PoItemSchema).min(1, 'At least one line item required'),
})

export const UpdatePurchaseOrderSchema = CreatePurchaseOrderSchema.partial().extend({
  id: z.string().uuid(),
})

export const PaymentSchema = z.object({
  po_id: z.string().uuid(),
  payment_ref: z.string().min(2),
  amount: z.coerce.number().positive(),
  currency: z.string().length(3).default('USD'),
  payment_date: z.string().optional().nullable(),
  payment_method: z.enum(['wire', 'cheque', 'cash', 'letter_of_credit']),
  bank_reference: z.string().optional(),
  notes: z.string().optional(),
})

export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderSchema>
export type UpdatePurchaseOrderInput = z.infer<typeof UpdatePurchaseOrderSchema>
export type PoItemInput = z.infer<typeof PoItemSchema>
export type PaymentInput = z.infer<typeof PaymentSchema>
