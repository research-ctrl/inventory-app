import { z } from 'zod'

export const CreateIssueSchema = z.object({
  pin_id: z.string().uuid('Select a PIN'),
  issued_to: z.string().uuid('Select recipient'),
  vessel_id: z.string().uuid().optional().nullable(),
  work_order: z.string().optional(),
  quantity: z.coerce.number().positive('Must be > 0'),
  unit: z.string().min(1),
  purpose: z.string().min(2, 'Purpose required'),
  expected_return_date: z.string().optional().nullable(),
})

export const UsageOutcomeSchema = z.object({
  issue_id: z.string().uuid(),
  outcome: z.enum(['not_used', 'leftover', 'scrap']),
  outcome_notes: z.string().optional(),
  quantity_returning: z.coerce.number().nonnegative().optional(),
  // For scrap: how much was scrapped
  quantity_scrapped: z.coerce.number().nonnegative().optional(),
})

export type CreateIssueInput = z.infer<typeof CreateIssueSchema>
export type UsageOutcomeInput = z.infer<typeof UsageOutcomeSchema>
