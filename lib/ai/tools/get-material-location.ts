import { createClient } from '@/lib/supabase/server'

export const getMaterialLocationTool = {
  name: 'get_material_location',
  description: 'Find the current warehouse location of a material by PIN ID or PIN number.',
  parameters: {
    type: 'object',
    properties: {
      pin_id: { type: 'string' },
      pin_number: { type: 'string' },
    },
  },
  async execute(args: { pin_id?: string; pin_number?: string }) {
    const supabase = await createClient()
    let query = supabase
      .from('v_inventory_status')
      .select('*')
      .limit(1)

    if (args.pin_id?.trim()) query = query.eq('pin_id', args.pin_id.trim())
    if (args.pin_number?.trim()) query = query.eq('pin_number', args.pin_number.trim())

    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(error.message)
    return { pin_id: args.pin_id ?? null, pin_number: args.pin_number ?? null, location: data }
  },
}
