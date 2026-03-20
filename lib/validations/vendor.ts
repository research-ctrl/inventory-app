import { z } from 'zod'

export const CreateVendorSchema = z.object({
  code: z.string().min(2).max(20).toUpperCase(),
  name: z.string().min(2, 'Vendor name required'),
  trade_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
  category: z.enum(['electrical', 'mechanical', 'paint', 'hardware', 'safety', 'general']),
  payment_terms_days: z.coerce.number().int().nonnegative().default(30),
  currency: z.string().length(3).default('USD'),
  tax_id: z.string().optional(),
  notes: z.string().optional(),
})

export const UpdateVendorSchema = CreateVendorSchema.partial().extend({
  id: z.string().uuid(),
})

export const VendorContactSchema = z.object({
  name: z.string().min(2),
  designation: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  is_primary: z.boolean().default(false),
})

export type CreateVendorInput = z.infer<typeof CreateVendorSchema>
export type UpdateVendorInput = z.infer<typeof UpdateVendorSchema>
export type VendorContactInput = z.infer<typeof VendorContactSchema>
