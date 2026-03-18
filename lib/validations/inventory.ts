import { z } from "zod";

export const inventoryPinSchema = z.object({
  pin_number: z.string().min(1),
  description: z.string().min(1),
  location_id: z.string().uuid(),
  quantity: z.number().nonnegative(),
  unit: z.string().min(1),
});

export type InventoryPinInput = z.infer<typeof inventoryPinSchema>;
