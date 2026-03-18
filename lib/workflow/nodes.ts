import type { WorkflowState } from "@/types/workflow";

export const WORKFLOW_STATES: WorkflowState[] = [
  "draft", "submitted", "under_review", "approved",
  "rejected", "in_progress", "completed", "cancelled",
];

export const TERMINAL_STATES: WorkflowState[] = ["approved", "rejected", "completed", "cancelled"];

export function isTerminal(state: WorkflowState): boolean {
  return TERMINAL_STATES.includes(state);
}
