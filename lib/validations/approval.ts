import { z } from 'zod'

export const ApprovalDecisionSchema = z.object({
  entity_type: z.string(),
  entity_id: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
  comment: z.string().optional(),
})

export type ApprovalDecisionInput = z.infer<typeof ApprovalDecisionSchema>
