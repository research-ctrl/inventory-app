export const findStockTool = {
  name: "find_stock",
  description: "Find current stock levels for a material by PIN number or description",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "PIN number or material description" },
    },
    required: ["query"],
  },
  async execute(args: { query: string }) {
    // TODO: Query inventory
    return { results: [], query: args.query };
  },
};
