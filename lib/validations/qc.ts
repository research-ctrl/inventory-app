import { z } from "zod";

export const qcInspectionSchema = z.object({
  delivery_id: z.string().uuid(),
  result: z.enum(["pass", "fail", "conditional"]),
  remarks: z.string().optional(),
});

export type QCInspectionInput = z.infer<typeof qcInspectionSchema>;
