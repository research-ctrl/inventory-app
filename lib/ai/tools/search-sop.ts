export const searchSOPTool = {
  name: "search_sop",
  description: "Search standard operating procedures and documentation",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string" },
    },
    required: ["query"],
  },
  async execute(args: { query: string }) {
    return { query: args.query, results: [] };
  },
};
