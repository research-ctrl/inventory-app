import { z } from "zod";

export const purchaseOrderSchema = z.object({
  requirement_id: z.string().uuid(),
  vendor_id: z.string().uuid(),
  total_amount: z.number().positive(),
  currency: z.string().length(3).default("USD"),
  expected_delivery: z.string().datetime(),
  notes: z.string().optional(),
});

export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;
