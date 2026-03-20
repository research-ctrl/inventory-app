import { createClient } from '@/lib/supabase/server'

export const getQCStatusTool = {
  name: 'get_qc_status',
  description: 'Get QC inspection results for a delivery.',
  parameters: {
    type: 'object',
    properties: {
      delivery_ref: { type: 'string', description: 'Delivery reference such as DLV-0001.' },
    },
    required: ['delivery_ref'],
  },
  async execute(args: { delivery_ref: string }) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('v_qc_summary')
      .select('*')
      .eq('delivery_ref', args.delivery_ref.trim())
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return { delivery_ref: args.delivery_ref, inspections: data ?? [] }
  },
}
