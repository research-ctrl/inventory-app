export const getQCStatusTool = {
  name: "get_qc_status",
  description: "Get QC inspection results for a delivery",
  parameters: {
    type: "object",
    properties: {
      delivery_ref: { type: "string" },
    },
    required: ["delivery_ref"],
  },
  async execute(args: { delivery_ref: string }) {
    return { delivery_ref: args.delivery_ref, inspections: [] };
  },
};
