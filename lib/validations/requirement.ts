import { z } from "zod";

export const requirementSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  vessel_name: z.string().optional(),
  department: z.string().optional(),
  urgency: z.enum(["routine", "urgent", "critical"]).default("routine"),
  required_date: z.string().datetime().optional(),
});

export type RequirementInput = z.infer<typeof requirementSchema>;
