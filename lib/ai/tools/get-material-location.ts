export const getMaterialLocationTool = {
  name: "get_material_location",
  description: "Find the current warehouse location of a material",
  parameters: {
    type: "object",
    properties: {
      pin_id: { type: "string" },
    },
    required: ["pin_id"],
  },
  async execute(args: { pin_id: string }) {
    return { pin_id: args.pin_id, location: null };
  },
};
