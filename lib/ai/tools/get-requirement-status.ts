import { createClient } from '@/lib/supabase/server'

export const getRequirementStatusTool = {
  name: 'get_requirement_status',
  description: 'Get the current status of a material requirement using its REQ number.',
  parameters: {
    type: 'object',
    properties: {
      ref_number: { type: 'string', description: 'Requirement reference number such as REQ-0001.' },
    },
    required: ['ref_number'],
  },
  async execute(args: { ref_number: string }) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('requirements')
      .select(`
        id, ref_number, title, status, urgency, required_date, created_at,
        vessel:vessels(name),
        items:requirement_items(line_number, description, quantity, unit)
      `)
      .eq('ref_number', args.ref_number.trim())
      .maybeSingle()

    if (error) throw new Error(error.message)
    return { ref_number: args.ref_number, requirement: data }
  },
}
