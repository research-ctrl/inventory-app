import type { WorkflowState, WorkflowEvent, WorkflowTransition } from "@/types/workflow";
import type { Role } from "@/lib/auth/roles";

export class StateMachine {
  constructor(private transitions: WorkflowTransition[]) {}

  canTransition(from: WorkflowState, event: WorkflowEvent, role: Role): boolean {
    return this.transitions.some(
      (t) => t.from === from && t.event === event && t.allowedRoles.includes(role)
    );
  }

  getNextState(from: WorkflowState, event: WorkflowEvent): WorkflowState | null {
    const transition = this.transitions.find(
      (t) => t.from === from && t.event === event
    );
    return transition?.to ?? null;
  }

  getAvailableEvents(from: WorkflowState, role: Role): WorkflowEvent[] {
    return this.transitions
      .filter((t) => t.from === from && t.allowedRoles.includes(role))
      .map((t) => t.event);
  }
}
