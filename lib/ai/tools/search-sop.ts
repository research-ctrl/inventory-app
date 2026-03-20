import { searchDocs } from '@/lib/docs'

export const searchSOPTool = {
  name: 'search_sop',
  description: 'Search operator guidance and SOP placeholder documentation for workflow instructions.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string' },
    },
    required: ['query'],
  },
  async execute(args: { query: string }) {
    const results = await searchDocs(args.query)
    return { query: args.query, results }
  },
}
