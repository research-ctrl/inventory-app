import { z } from "zod";

export const deliverySchema = z.object({
  po_id: z.string().uuid(),
  delivery_ref: z.string().min(1),
  notes: z.string().optional(),
});

export type DeliveryInput = z.infer<typeof deliverySchema>;
