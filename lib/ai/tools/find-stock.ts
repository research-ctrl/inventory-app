import { createClient } from '@/lib/supabase/server'

export const findStockTool = {
  name: 'find_stock',
  description: 'Find current stock levels for a material by PIN number, part number, or description.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'PIN number, part number, or material description.' },
    },
    required: ['query'],
  },
  async execute(args: { query: string }) {
    const supabase = await createClient()
    const query = args.query.trim()
    const { data, error } = await supabase
      .from('v_stock_balance')
      .select('*')
      .or(`pin_number.ilike.%${query}%,description.ilike.%${query}%,part_number.ilike.%${query}%`)
      .order('pin_number')
      .limit(8)

    if (error) throw new Error(error.message)
    return { query: args.query, results: data ?? [] }
  },
}
