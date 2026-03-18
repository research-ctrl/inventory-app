export const traceMaterialGenealogyTool = {
  name: "trace_material_genealogy",
  description: "Trace the full lifecycle history of a material item",
  parameters: {
    type: "object",
    properties: {
      pin_id: { type: "string" },
    },
    required: ["pin_id"],
  },
  async execute(args: { pin_id: string }) {
    return { pin_id: args.pin_id, genealogy: [] };
  },
};
