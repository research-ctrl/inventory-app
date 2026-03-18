export const getRequirementStatusTool = {
  name: "get_requirement_status",
  description: "Get the current status of a material requirement",
  parameters: {
    type: "object",
    properties: {
      ref_number: { type: "string", description: "Requirement reference number" },
    },
    required: ["ref_number"],
  },
  async execute(args: { ref_number: string }) {
    // TODO: Query requirements
    return { ref_number: args.ref_number, status: null };
  },
};
