import { createClient } from '@/lib/supabase/server'

export const getRecoveryStatusTool = {
  name: 'get_recovery_status',
  description: 'Get recovery status by issue number, issue id, or recovery reference.',
  parameters: {
    type: 'object',
    properties: {
      issue_id: { type: 'string' },
      issue_number: { type: 'string' },
      recovery_ref: { type: 'string' },
    },
  },
  async execute(args: { issue_id?: string; issue_number?: string; recovery_ref?: string }) {
    const supabase = await createClient()
    let recoveryQuery = supabase.from('v_recovery_summary').select('*').limit(10)

    if (args.recovery_ref?.trim()) {
      recoveryQuery = recoveryQuery.eq('recovery_ref', args.recovery_ref.trim())
    } else if (args.issue_number?.trim()) {
      recoveryQuery = recoveryQuery.eq('issue_number', args.issue_number.trim())
    } else if (args.issue_id?.trim()) {
      const { data: issue } = await supabase.from('material_issues').select('issue_number').eq('id', args.issue_id.trim()).maybeSingle()
      if (issue?.issue_number) recoveryQuery = recoveryQuery.eq('issue_number', issue.issue_number)
    }

    const { data, error } = await recoveryQuery.order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return { issue_id: args.issue_id ?? null, issue_number: args.issue_number ?? null, recovery_ref: args.recovery_ref ?? null, recovery: data ?? [] }
  },
}
