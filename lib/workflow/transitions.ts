import type { WorkflowTransition } from "@/types/workflow";
import { ROLES } from "@/lib/auth/roles";

export const REQUIREMENT_TRANSITIONS: WorkflowTransition[] = [
  {
    from: "draft", to: "submitted", event: "submit",
    allowedRoles: [ROLES.ENGINEER, ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN],
  },
  {
    from: "submitted", to: "under_review", event: "start",
    allowedRoles: [ROLES.APPROVER, ROLES.PROCUREMENT_MANAGER, ROLES.ADMIN],
  },
  {
    from: "under_review", to: "approved", event: "approve",
    allowedRoles: [ROLES.APPROVER, ROLES.PROCUREMENT_MANAGER, ROLES.ADMIN],
    requiresComment: false,
  },
  {
    from: "under_review", to: "rejected", event: "reject",
    allowedRoles: [ROLES.APPROVER, ROLES.PROCUREMENT_MANAGER, ROLES.ADMIN],
    requiresComment: true,
  },
  {
    from: "approved", to: "in_progress", event: "start",
    allowedRoles: [ROLES.PROCUREMENT_OFFICER, ROLES.PROCUREMENT_MANAGER, ROLES.ADMIN],
  },
  {
    from: "in_progress", to: "completed", event: "complete",
    allowedRoles: [ROLES.PROCUREMENT_OFFICER, ROLES.PROCUREMENT_MANAGER, ROLES.ADMIN],
  },
];
