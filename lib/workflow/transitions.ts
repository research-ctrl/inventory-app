import type { UserRole } from '@/types/database'

export type ItemStatus = string | null

export interface WorkflowTransition {
  from: ItemStatus
  to: string
  event: string
  allowedRoles: UserRole[]
  label: string
}

export const WORKFLOW_TRANSITIONS: Record<string, WorkflowTransition[]> = {
  requirement: [
    {
      from: null,
      to: 'draft',
      event: 'create',
      allowedRoles: [
        'super_admin', 'admin', 'procurement_manager', 'procurement_officer',
        'store_manager', 'store_keeper', 'qc_inspector', 'engineer',
        'approver', 'finance', 'shipbuilder', 'viewer',
      ],
      label: 'Create',
    },
    {
      from: 'draft',
      to: 'submitted',
      event: 'submit',
      allowedRoles: ['engineer', 'procurement_officer', 'procurement_manager', 'admin', 'super_admin', 'finance', 'store_manager', 'store_keeper', 'shipbuilder'],
      label: 'Submit Request',
    },
    // Part 1: Procurement decision flow
    {
      from: 'submitted',
      to: 'to_order',
      event: 'procurement_review',
      allowedRoles: ['procurement_officer', 'procurement_manager', 'admin', 'super_admin'],
      label: 'Order Item',
    },
    {
      from: 'submitted',
      to: 'to_enquire_price',
      event: 'procurement_review',
      allowedRoles: ['procurement_officer', 'procurement_manager', 'admin', 'super_admin'],
      label: 'Enquire Price',
    },
    {
      from: 'submitted',
      to: 'to_release_from_inventory',
      event: 'procurement_review',
      allowedRoles: ['procurement_officer', 'procurement_manager', 'admin', 'super_admin'],
      label: 'Release from Inventory',
    },
    {
      from: 'to_release_from_inventory',
      to: 'pending_approval',
      event: 'request_approval',
      allowedRoles: ['procurement_officer', 'procurement_manager', 'admin', 'super_admin'],
      label: 'Request Release Approval',
    },
    {
      from: 'to_release_from_inventory',
      to: 'issued',
      event: 'release_without_approval',
      allowedRoles: ['procurement_manager', 'admin', 'super_admin'],
      label: 'Release without Approval',
    },
    {
      from: 'to_release_from_inventory',
      to: 'rejected',
      event: 'reject',
      allowedRoles: ['procurement_manager', 'admin', 'super_admin'],
      label: 'Decline',
    },
    {
      from: 'pending_approval',
      to: 'issued',
      event: 'approve_release',
      allowedRoles: ['approver', 'procurement_manager', 'admin', 'super_admin'],
      label: 'Approve & Release',
    },
    {
      from: 'pending_approval',
      to: 'rejected',
      event: 'reject',
      allowedRoles: ['approver', 'procurement_manager', 'admin', 'super_admin'],
      label: 'Decline',
    },
    // Legacy transitions (kept for backwards compatibility)
    {
      from: 'submitted',
      to: 'in_progress',
      event: 'review',
      allowedRoles: ['procurement_officer', 'procurement_manager', 'admin', 'super_admin'],
      label: 'Start Review',
    },
    {
      from: 'submitted',
      to: 'rejected',
      event: 'reject',
      allowedRoles: ['procurement_manager', 'admin', 'super_admin'],
      label: 'Reject',
    },
    {
      from: 'rejected',
      to: 'draft',
      event: 'revise',
      allowedRoles: ['engineer', 'procurement_officer', 'procurement_manager', 'admin', 'super_admin', 'finance', 'store_manager', 'store_keeper', 'shipbuilder'],
      label: 'Revise & Resubmit',
    },
    {
      from: 'in_progress',
      to: 'ordered',
      event: 'raise_po',
      allowedRoles: ['procurement_officer', 'procurement_manager', 'admin', 'super_admin'],
      label: 'PO Created',
    },
    {
      from: 'ordered',
      to: 'completed',
      event: 'complete',
      allowedRoles: ['procurement_manager', 'store_manager', 'admin', 'super_admin'],
      label: 'Mark Completed',
    },
    {
      from: 'in_progress',
      to: 'completed',
      event: 'complete',
      allowedRoles: ['procurement_manager', 'store_manager', 'admin', 'super_admin'],
      label: 'Complete (From Stock)',
    },
    // Cancel from any active state
    {
      from: 'draft',
      to: 'cancelled',
      event: 'cancel',
      allowedRoles: ['engineer', 'procurement_officer', 'procurement_manager', 'admin', 'super_admin', 'finance', 'store_manager', 'store_keeper', 'shipbuilder'],
      label: 'Cancel Request',
    },
    {
      from: 'submitted',
      to: 'cancelled',
      event: 'cancel',
      allowedRoles: ['procurement_manager', 'admin', 'super_admin'],
      label: 'Cancel Request',
    },
    {
      from: 'in_progress',
      to: 'cancelled',
      event: 'cancel',
      allowedRoles: ['procurement_manager', 'admin', 'super_admin'],
      label: 'Cancel Request',
    },
    {
      from: 'rejected',
      to: 'cancelled',
      event: 'cancel',
      allowedRoles: ['engineer', 'procurement_officer', 'procurement_manager', 'admin', 'super_admin', 'finance', 'store_manager', 'store_keeper', 'shipbuilder'],
      label: 'Cancel Request',
    },
  ],

  purchase_order: [
    {
      from: null,
      to: 'draft',
      event: 'create',
      allowedRoles: ['approver', 'procurement_officer', 'procurement_manager', 'admin', 'super_admin'],
      label: 'Create',
    },
    {
      from: 'draft',
      to: 'pending_approval',
      event: 'submit',
      allowedRoles: ['approver', 'procurement_officer', 'procurement_manager', 'admin', 'super_admin'],
      label: 'Submit for Approval',
    },
    {
      from: 'pending_approval',
      to: 'approved',
      event: 'approve',
      allowedRoles: ['approver', 'procurement_manager', 'admin', 'super_admin'],
      label: 'Approve',
    },
    {
      from: 'pending_approval',
      to: 'rejected',
      event: 'reject',
      allowedRoles: ['approver', 'procurement_manager', 'admin', 'super_admin'],
      label: 'Reject',
    },
    {
      from: 'rejected',
      to: 'draft',
      event: 'revise',
      allowedRoles: ['procurement_officer', 'procurement_manager', 'admin', 'super_admin'],
      label: 'Revise',
    },
    {
      from: 'approved',
      to: 'ordered',
      event: 'place_order',
      allowedRoles: ['procurement_officer', 'procurement_manager', 'admin', 'super_admin'],
      label: 'Place Order',
    },
    {
      from: 'ordered',
      to: 'partially_delivered',
      event: 'receive_partial',
      allowedRoles: ['store_keeper', 'store_manager', 'admin', 'super_admin'],
      label: 'Receive Partial',
    },
    {
      from: 'ordered',
      to: 'delivered',
      event: 'receive_full',
      allowedRoles: ['store_keeper', 'store_manager', 'admin', 'super_admin'],
      label: 'Receive Full',
    },
    {
      from: 'partially_delivered',
      to: 'delivered',
      event: 'receive_full',
      allowedRoles: ['store_keeper', 'store_manager', 'admin', 'super_admin'],
      label: 'Receive Full',
    },
    {
      from: 'delivered',
      to: 'closed',
      event: 'close',
      allowedRoles: ['procurement_manager', 'admin', 'super_admin'],
      label: 'Close',
    },
    {
      from: 'ordered',
      to: 'cancelled',
      event: 'cancel',
      allowedRoles: ['procurement_manager', 'admin', 'super_admin'],
      label: 'Cancel',
    },
  ],

  delivery: [
    {
      from: null,
      to: 'order_placed',
      event: 'create',
      allowedRoles: ['store_keeper', 'store_manager', 'procurement_officer', 'procurement_manager', 'admin', 'super_admin'],
      label: 'Create',
    },
    {
      from: 'order_placed',
      to: 'in_transit',
      event: 'dispatch',
      allowedRoles: ['store_keeper', 'store_manager', 'procurement_officer', 'procurement_manager', 'admin', 'super_admin'],
      label: 'Mark In Transit',
    },
    {
      from: 'pending_approval',
      to: 'in_transit',
      event: 'dispatch',
      allowedRoles: ['store_keeper', 'store_manager', 'procurement_officer', 'procurement_manager', 'admin', 'super_admin'],
      label: 'Mark In Transit',
    },
    {
      from: 'in_transit',
      to: 'delivered',
      event: 'receive',
      allowedRoles: ['store_keeper', 'store_manager', 'admin', 'super_admin'],
      label: 'Mark Delivered',
    },
    {
      from: 'order_placed',
      to: 'delivered',
      event: 'receive',
      allowedRoles: ['store_keeper', 'store_manager', 'admin', 'super_admin'],
      label: 'Mark Delivered',
    },
    {
      from: 'pending_approval',
      to: 'delivered',
      event: 'receive',
      allowedRoles: ['store_keeper', 'store_manager', 'admin', 'super_admin'],
      label: 'Mark Delivered',
    },
    {
      from: 'delivered',
      to: 'qc_pending',
      event: 'send_to_qc',
      allowedRoles: ['store_keeper', 'store_manager', 'qc_inspector', 'admin', 'super_admin'],
      label: 'Send to QC',
    },
    {
      from: 'qc_pending',
      to: 'qc_passed',
      event: 'pass_inspection',
      allowedRoles: ['qc_inspector', 'admin', 'super_admin'],
      label: 'Pass QC',
    },
    {
      from: 'qc_pending',
      to: 'qc_failed',
      event: 'fail_inspection',
      allowedRoles: ['qc_inspector', 'admin', 'super_admin'],
      label: 'Fail QC',
    },
    {
      from: 'qc_pending',
      to: 'qc_conditional',
      event: 'conditional_inspection',
      allowedRoles: ['qc_inspector', 'admin', 'super_admin'],
      label: 'Conditional Pass',
    },
    {
      from: 'qc_passed',
      to: 'closed',
      event: 'accept_into_inventory',
      allowedRoles: ['store_keeper', 'store_manager', 'admin', 'super_admin'],
      label: 'Accept into Inventory',
    },
    {
      from: 'qc_conditional',
      to: 'closed',
      event: 'accept_into_inventory',
      allowedRoles: ['store_keeper', 'store_manager', 'admin', 'super_admin'],
      label: 'Accept into Inventory',
    },
    {
      from: 'order_placed',
      to: 'cancelled',
      event: 'cancel',
      allowedRoles: ['procurement_manager', 'admin', 'super_admin'],
      label: 'Cancel Delivery',
    },
    {
      from: 'in_transit',
      to: 'delayed',
      event: 'delay',
      allowedRoles: ['store_keeper', 'store_manager', 'procurement_officer', 'procurement_manager', 'admin', 'super_admin'],
      label: 'Mark Delayed',
    },
    {
      from: 'delayed',
      to: 'in_transit',
      event: 'resume',
      allowedRoles: ['store_keeper', 'store_manager', 'procurement_officer', 'procurement_manager', 'admin', 'super_admin'],
      label: 'Resume Transit',
    },
    {
      from: 'delayed',
      to: 'delivered',
      event: 'receive',
      allowedRoles: ['store_keeper', 'store_manager', 'admin', 'super_admin'],
      label: 'Mark Delivered',
    },
  ],

  issue: [
    {
      from: null,
      to: 'draft',
      event: 'create',
      allowedRoles: ['engineer', 'store_keeper', 'store_manager', 'admin', 'super_admin'],
      label: 'Create',
    },
    {
      from: 'draft',
      to: 'pending_approval',
      event: 'submit',
      allowedRoles: ['engineer', 'store_keeper', 'store_manager', 'admin', 'super_admin'],
      label: 'Submit for Approval',
    },
    {
      from: 'pending_approval',
      to: 'approved',
      event: 'approve',
      allowedRoles: ['store_manager', 'approver', 'admin', 'super_admin'],
      label: 'Approve',
    },
    {
      from: 'pending_approval',
      to: 'rejected',
      event: 'reject',
      allowedRoles: ['store_manager', 'approver', 'admin', 'super_admin'],
      label: 'Reject',
    },
    {
      from: 'approved',
      to: 'issued',
      event: 'issue_material',
      allowedRoles: ['store_keeper', 'store_manager', 'admin', 'super_admin'],
      label: 'Issue Material',
    },
    {
      from: 'issued',
      to: 'partially_returned',
      event: 'partial_return',
      allowedRoles: ['store_keeper', 'store_manager', 'admin', 'super_admin'],
      label: 'Partial Return',
    },
    {
      from: 'issued',
      to: 'fully_returned',
      event: 'full_return',
      allowedRoles: ['store_keeper', 'store_manager', 'admin', 'super_admin'],
      label: 'Full Return',
    },
    {
      from: 'partially_returned',
      to: 'fully_returned',
      event: 'full_return',
      allowedRoles: ['store_keeper', 'store_manager', 'admin', 'super_admin'],
      label: 'Full Return',
    },
  ],

  recovery: [
    {
      from: null,
      to: 'pending_assessment',
      event: 'create',
      allowedRoles: ['store_keeper', 'store_manager', 'admin', 'super_admin'],
      label: 'Create',
    },
    {
      from: 'pending_assessment',
      to: 'assessed',
      event: 'assess',
      allowedRoles: ['store_manager', 'qc_inspector', 'admin', 'super_admin'],
      label: 'Assess',
    },
    {
      from: 'assessed',
      to: 'repair_pending',
      event: 'send_for_repair',
      allowedRoles: ['store_manager', 'admin', 'super_admin'],
      label: 'Send for Repair',
    },
    {
      from: 'assessed',
      to: 'scrapped',
      event: 'scrap_material',
      allowedRoles: ['store_manager', 'admin', 'super_admin'],
      label: 'Scrap Material',
    },
    {
      from: 'assessed',
      to: 'for_sale',
      event: 'list_for_sale',
      allowedRoles: ['store_manager', 'admin', 'super_admin'],
      label: 'List for Sale',
    },
    {
      from: 'assessed',
      to: 'closed',
      event: 'mark_reuse',
      allowedRoles: ['store_manager', 'admin', 'super_admin'],
      label: 'Mark for Reuse',
    },
    {
      from: 'repair_pending',
      to: 'repaired',
      event: 'mark_repaired',
      allowedRoles: ['store_manager', 'admin', 'super_admin'],
      label: 'Mark Repaired',
    },
    {
      from: 'repaired',
      to: 'closed',
      event: 'accept_into_inventory',
      allowedRoles: ['store_manager', 'admin', 'super_admin'],
      label: 'Accept into Inventory',
    },
  ],

  qc_inspection: [
    {
      from: null,
      to: 'pending',
      event: 'create',
      allowedRoles: ['qc_inspector', 'store_manager', 'admin', 'super_admin'],
      label: 'Create Inspection',
    },
    {
      from: 'pending',
      to: 'in_progress',
      event: 'start',
      allowedRoles: ['qc_inspector', 'admin', 'super_admin'],
      label: 'Start Inspection',
    },
    {
      from: 'in_progress',
      to: 'passed',
      event: 'pass',
      allowedRoles: ['qc_inspector', 'admin', 'super_admin'],
      label: 'Pass',
    },
    {
      from: 'in_progress',
      to: 'failed',
      event: 'fail',
      allowedRoles: ['qc_inspector', 'admin', 'super_admin'],
      label: 'Fail',
    },
    {
      from: 'in_progress',
      to: 'conditional',
      event: 'conditional_pass',
      allowedRoles: ['qc_inspector', 'admin', 'super_admin'],
      label: 'Conditional Pass',
    },
  ],
}

/**
 * Returns the list of transitions available for a given entity type, current status, and user role.
 */
export function getAvailableTransitions(
  entityType: string,
  currentStatus: string | null,
  userRole: UserRole
): WorkflowTransition[] {
  const transitions = WORKFLOW_TRANSITIONS[entityType]
  if (!transitions) return []
  return transitions.filter(
    (t) => t.from === currentStatus && t.allowedRoles.includes(userRole)
  )
}

/**
 * Returns true if the given role can perform the specified transition for the entity type.
 */
export function canTransition(
  entityType: string,
  from: string | null,
  to: string,
  userRole: UserRole
): boolean {
  const transitions = WORKFLOW_TRANSITIONS[entityType]
  if (!transitions) return false
  return transitions.some(
    (t) => t.from === from && t.to === to && t.allowedRoles.includes(userRole)
  )
}
