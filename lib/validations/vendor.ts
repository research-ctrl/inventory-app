import { z } from "zod";

export const vendorSchema = z.object({
  name: z.string().min(2).max(255),
  code: z.string().min(2).max(20),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  address: z.string().optional(),
  category: z.string().optional(),
});

export type VendorInput = z.infer<typeof vendorSchema>;
