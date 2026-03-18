import { z } from "zod";

export const issueSchema = z.object({
  pin_id: z.string().uuid(),
  issued_to: z.string().uuid(),
  quantity: z.number().positive(),
  vessel_name: z.string().min(1),
  work_order: z.string().optional(),
});

export type IssueInput = z.infer<typeof issueSchema>;
