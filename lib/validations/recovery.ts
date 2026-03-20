import { z } from 'zod'

export const CreateRecoverySchema = z.object({
  issue_id: z.string().uuid(),
  pin_id: z.string().uuid(),
  quantity_returned: z.coerce.number().positive(),
  recovery_location_id: z.string().uuid().optional().nullable(),
  condition_notes: z.string().optional(),
})

export const AssessRecoverySchema = z.object({
  recovery_id: z.string().uuid(),
  condition_grade: z.enum(['A', 'B', 'C', 'D', 'scrap']),
  condition_notes: z.string().optional(),
  outcome: z.enum(['reuse', 'repair', 'scrap', 'sell']),
  disposition_notes: z.string().optional(),
  recovery_location_id: z.string().uuid().optional().nullable(),
})

export const CreateDerivedPinSchema = z.object({
  recovery_id: z.string().uuid(),
  parent_pin_id: z.string().uuid(),
  description: z.string().min(2),
  part_number: z.string().optional(),
  category: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.coerce.number().positive(),
  location_id: z.string().uuid('Select location'),
  unit_cost: z.coerce.number().nonnegative().optional(),
})

export const ScrapPinSchema = z.object({
  pin_id: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  reason: z.string().min(2),
})

export const HoldPinSchema = z.object({
  pin_id: z.string().uuid(),
  notes: z.string().min(2),
})

export type CreateRecoveryInput = z.infer<typeof CreateRecoverySchema>
export type AssessRecoveryInput = z.infer<typeof AssessRecoverySchema>
export type CreateDerivedPinInput = z.infer<typeof CreateDerivedPinSchema>
export type ScrapPinInput = z.infer<typeof ScrapPinSchema>
export type HoldPinInput = z.infer<typeof HoldPinSchema>
