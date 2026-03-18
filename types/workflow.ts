export type WorkflowState =
  | "draft" | "submitted" | "under_review" | "approved"
  | "rejected" | "in_progress" | "completed" | "cancelled";

export type WorkflowEvent =
  | "submit" | "approve" | "reject" | "start" | "complete" | "cancel" | "revise";

export interface WorkflowTransition {
  from: WorkflowState;
  to: WorkflowState;
  event: WorkflowEvent;
  allowedRoles: string[];
  requiresComment?: boolean;
}

export interface WorkflowHistory {
  id: string;
  entity_id: string;
  entity_type: string;
  from_state: WorkflowState;
  to_state: WorkflowState;
  event: WorkflowEvent;
  actor_id: string;
  comment: string | null;
  created_at: string;
}
