export const getPOStatusTool = {
  name: "get_po_status",
  description: "Get the current status of a purchase order",
  parameters: {
    type: "object",
    properties: {
      po_number: { type: "string", description: "Purchase order number" },
    },
    required: ["po_number"],
  },
  async execute(args: { po_number: string }) {
    return { po_number: args.po_number, status: null };
  },
};
