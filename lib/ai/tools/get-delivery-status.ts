export const getDeliveryStatusTool = {
  name: "get_delivery_status",
  description: "Get delivery status for a purchase order",
  parameters: {
    type: "object",
    properties: {
      po_number: { type: "string" },
    },
    required: ["po_number"],
  },
  async execute(args: { po_number: string }) {
    return { po_number: args.po_number, deliveries: [] };
  },
};
