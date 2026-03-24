import { z } from 'zod'

export const REQUEST_TYPES = [
  { value: 'to_order',                    label: 'Purchase / Order' },
  { value: 'to_enquire_price',            label: 'Enquire Price' },
  { value: 'to_release_from_inventory',   label: 'Release from Inventory' },
] as const

export type RequestTypeValue = 'to_order' | 'to_enquire_price' | 'to_release_from_inventory'

export const RequirementItemSchema = z.object({
  id: z.string().uuid().optional(),
  line_number: z.number().int().positive(),
  description: z.string().min(2, 'Description required'),
  part_number: z.string().optional().nullable(),
  quantity: z.coerce.number().positive('Must be > 0'),
  unit: z.string().min(1, 'Unit required'),
  estimated_unit_price: z.coerce.number().nonnegative().optional().nullable(),
  currency: z.string().length(3).default('USD'),
  specifications: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // New: item-level inventory link
  inventory_pin_id: z.string().uuid().optional().nullable(),
  item_request_type: z.enum([
    'to_order', 'to_enquire_price', 'to_release_from_inventory',
  ]).optional().nullable(),
})

export const CreateRequirementSchema = z.object({
  // Title is auto-generated from items if not provided
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  vessel_id: z.string().uuid().optional().nullable(),
  department_id: z.string().uuid().optional().nullable(),
  preferred_vendor_id: z.string().uuid().optional().nullable(),
  preferred_vendor_free_text: z.string().max(500).optional().nullable(),
  urgency: z.enum(['routine', 'urgent', 'critical']).default('routine'),
  required_date: z.string().optional().nullable(),
  budget_estimate: z.coerce.number().nonnegative().optional().nullable(),
  currency: z.string().length(3).default('USD'),
  reason: z.string().max(1000).optional().nullable(),
  // on-behalf-of: profile FK (if registered) OR free text
  requested_on_behalf_of_profile_id: z.string().uuid().optional().nullable(),
  requested_on_behalf_of: z.string().max(200).optional().nullable(),
  // Form-level request type (derived from items)
  request_type: z.enum([
    'to_order', 'to_enquire_price', 'to_release_from_inventory', 'mixed',
  ]).optional().nullable(),
  items: z.array(RequirementItemSchema).min(1, 'At least one item required'),
})

export const UpdateRequirementSchema = CreateRequirementSchema.partial().extend({
  id: z.string().uuid(),
})

export type CreateRequirementInput = z.infer<typeof CreateRequirementSchema>
export type UpdateRequirementInput = z.infer<typeof UpdateRequirementSchema>
export type RequirementItemInput = z.infer<typeof RequirementItemSchema>
