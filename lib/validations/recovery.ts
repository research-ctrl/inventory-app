import { z } from "zod";

export const recoverySchema = z.object({
  issue_id: z.string().uuid(),
  pin_id: z.string().uuid(),
  quantity_returned: z.number().positive(),
  outcome: z.enum(["reuse", "repair", "scrap", "sell"]),
});

export type RecoveryInput = z.infer<typeof recoverySchema>;
