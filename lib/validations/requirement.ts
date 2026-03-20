import { z } from 'zod'

export const RequirementItemSchema = z.object({
  id: z.string().uuid().optional(),
  line_number: z.number().int().positive(),
  description: z.string().min(2, 'Description required'),
  part_number: z.string().optional(),
  quantity: z.coerce.number().positive('Must be > 0'),
  unit: z.string().min(1, 'Unit required'),
  estimated_unit_price: z.coerce.number().nonnegative().optional(),
  currency: z.string().length(3).default('USD'),
  specifications: z.string().optional(),
  notes: z.string().optional(),
})

export const CreateRequirementSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  vessel_id: z.string().uuid('Select a vessel').optional().nullable(),
  department_id: z.string().uuid('Select a department').optional().nullable(),
  urgency: z.enum(['routine', 'urgent', 'critical']).default('routine'),
  required_date: z.string().optional().nullable(),
  budget_estimate: z.coerce.number().nonnegative().optional().nullable(),
  currency: z.string().length(3).default('USD'),
  items: z.array(RequirementItemSchema).min(1, 'At least one item required'),
})

export const UpdateRequirementSchema = CreateRequirementSchema.partial().extend({
  id: z.string().uuid(),
})

export type CreateRequirementInput = z.infer<typeof CreateRequirementSchema>
export type UpdateRequirementInput = z.infer<typeof UpdateRequirementSchema>
export type RequirementItemInput = z.infer<typeof RequirementItemSchema>
