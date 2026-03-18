export const getRecoveryStatusTool = {
  name: "get_recovery_status",
  description: "Get the recovery status of returned materials",
  parameters: {
    type: "object",
    properties: {
      issue_id: { type: "string" },
    },
    required: ["issue_id"],
  },
  async execute(args: { issue_id: string }) {
    return { issue_id: args.issue_id, recovery: null };
  },
};
