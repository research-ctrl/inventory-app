import { getTraceabilityForPin } from '@/lib/db/queries/lifecycle'
import { createClient } from '@/lib/supabase/server'

export const traceMaterialGenealogyTool = {
  name: 'trace_material_genealogy',
  description: 'Trace the full lifecycle and genealogy of a PIN.',
  parameters: {
    type: 'object',
    properties: {
      pin_id: { type: 'string' },
      pin_number: { type: 'string' },
    },
  },
  async execute(args: { pin_id?: string; pin_number?: string }) {
    const supabase = await createClient()
    let pinId = args.pin_id?.trim() ?? ''

    if (!pinId && args.pin_number?.trim()) {
      const { data } = await supabase
        .from('inventory_pins')
        .select('id')
        .eq('pin_number', args.pin_number.trim())
        .maybeSingle()
      pinId = data?.id ?? ''
    }

    if (!pinId) return { pin_id: args.pin_id ?? null, pin_number: args.pin_number ?? null, genealogy: null }

    const trace = await getTraceabilityForPin(pinId)
    return { pin_id: pinId, pin_number: trace.pin?.pin_number ?? args.pin_number ?? null, genealogy: trace }
  },
}
