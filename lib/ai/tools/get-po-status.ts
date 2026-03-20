import { createClient } from '@/lib/supabase/server'

export const getPOStatusTool = {
  name: 'get_po_status',
  description: 'Get the current status of a purchase order.',
  parameters: {
    type: 'object',
    properties: {
      po_number: { type: 'string', description: 'Purchase order number such as PO-0001.' },
    },
    required: ['po_number'],
  },
  async execute(args: { po_number: string }) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        id, po_number, status, total_amount, currency, created_at,
        vendor:vendors(name),
        requirement:requirements(ref_number, title)
      `)
      .eq('po_number', args.po_number.trim())
      .maybeSingle()

    if (error) throw new Error(error.message)
    return { po_number: args.po_number, purchase_order: data }
  },
}
