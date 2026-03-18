import { REQUIREMENT_TRANSITIONS } from "./transitions";
import { StateMachine } from "./state-machine";

export const requirementStateMachine = new StateMachine(REQUIREMENT_TRANSITIONS);
// TODO: Add state machines for PO, Delivery, QC, Issue, Recovery
