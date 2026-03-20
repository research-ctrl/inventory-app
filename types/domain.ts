// Domain interfaces — Shipyard Material Lifecycle System
// Clean camelCase types for UI and business logic. Relationships are typed
// where commonly traversed together.

export type UUID = string;
export type ISODateString = string;

// ------------------------------------------------------------------ //
// Enums (re-exported as plain union types)
// ------------------------------------------------------------------ //

export type UserRole =
  | "super_admin"
  | "admin"
  | "procurement_manager"
  | "procurement_officer"
  | "store_manager"
  | "store_keeper"
  | "qc_inspector"
  | "engineer"
  | "approver"
  | "finance"
  | "shipbuilder"
  | "viewer";

export type ItemStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "in_progress"
  | "ordered"
  | "partially_delivered"
  | "delivered"
  | "received"
  | "qc_pending"
  | "qc_passed"
  | "qc_failed"
  | "qc_conditional"
  | "issued"
  | "partially_returned"
  | "fully_returned"
  | "closed"
  | "cancelled"
  | "on_hold"
  | "pending_assessment"
  | "assessed"
  | "repair_pending"
  | "repaired"
  | "scrapped"
  | "for_sale";

export type UrgencyLevel = "routine" | "urgent" | "critical";
export type QcResult = "pass" | "fail" | "conditional";
export type RecoveryOutcome = "reuse" | "repair" | "scrap" | "sell";
export type TransactionType =
  | "receipt"
  | "issue"
  | "return"
  | "adjustment"
  | "transfer"
  | "write_off"
  | "reversal";
export type WorkflowEvent =
  | "submit"
  | "approve"
  | "reject"
  | "revise"
  | "raise_po"
  | "place_order"
  | "receive"
  | "send_to_qc"
  | "start_inspection"
  | "pass_inspection"
  | "fail_inspection"
  | "conditional_inspection"
  | "accept_into_inventory"
  | "initiate_return"
  | "issue_material"
  | "partial_return"
  | "full_return"
  | "close"
  | "cancel"
  | "assess"
  | "mark_reuse"
  | "send_for_repair"
  | "mark_repaired"
  | "scrap_material"
  | "list_for_sale"
  | "hold"
  | "resume";

// ------------------------------------------------------------------ //
// Core entities
// ------------------------------------------------------------------ //

export interface Profile {
  id: UUID;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  department: string | null;
  employeeId: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Vessel {
  id: UUID;
  name: string;
  imoNumber: string | null;
  vesselType: string | null;
  flag: string | null;
  owner: string | null;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Department {
  id: UUID;
  code: string;
  name: string;
  headId: UUID | null;
  head?: Profile;
  isActive: boolean;
  createdAt: ISODateString;
}

export interface WorkflowHistoryEntry {
  id: UUID;
  entityType: string;
  entityId: UUID;
  fromStatus: string | null;
  toStatus: string;
  event: WorkflowEvent;
  actorId: UUID | null;
  actor?: Profile;
  comment: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: ISODateString;
}

export interface AppNotification {
  id: UUID;
  recipientId: UUID;
  entityType: string | null;
  entityId: UUID | null;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: ISODateString;
}

export interface AuditLogEntry {
  id: UUID;
  actorId: UUID | null;
  actor?: Profile;
  action: string;
  entityType: string;
  entityId: UUID | null;
  ipAddress: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: ISODateString;
}

// ------------------------------------------------------------------ //
// Procurement
// ------------------------------------------------------------------ //

export interface RequirementItem {
  id: UUID;
  requirementId: UUID;
  lineNumber: number;
  description: string;
  partNumber: string | null;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number | null;
  currency: string | null;
  specifications: string | null;
  notes: string | null;
  createdAt: ISODateString;
}

export interface Requirement {
  id: UUID;
  refNumber: string;
  title: string;
  description: string | null;
  vesselId: UUID | null;
  vessel?: Vessel;
  departmentId: UUID | null;
  department?: Department;
  requestedBy: UUID;
  requestedByProfile?: Profile;
  urgency: UrgencyLevel;
  status: ItemStatus;
  requiredDate: ISODateString | null;
  budgetEstimate: number | null;
  currency: string | null;
  rejectionReason: string | null;
  approvedBy: UUID | null;
  approvedAt: ISODateString | null;
  items?: RequirementItem[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface VendorContact {
  id: UUID;
  vendorId: UUID;
  name: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  createdAt: ISODateString;
}

export interface Vendor {
  id: UUID;
  code: string;
  name: string;
  tradeName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  category: string | null;
  rating: number | null;
  paymentTermsDays: number | null;
  currency: string | null;
  taxId: string | null;
  bankDetails: Record<string, unknown> | null;
  isApproved: boolean;
  approvedBy: UUID | null;
  approvedAt: ISODateString | null;
  blacklisted: boolean;
  blacklistReason: string | null;
  notes: string | null;
  contacts?: VendorContact[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Approval {
  id: UUID;
  entityType: string;
  entityId: UUID;
  stepNumber: number;
  approverId: UUID;
  approver?: Profile;
  status: ItemStatus;
  comment: string | null;
  decidedAt: ISODateString | null;
  dueDate: ISODateString | null;
  escalated: boolean;
  createdAt: ISODateString;
}

export interface PoItem {
  id: UUID;
  poId: UUID;
  requirementItemId: UUID | null;
  lineNumber: number;
  description: string;
  partNumber: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  currency: string;
  taxRate: number | null;
  discountRate: number | null;
  lineTotal: number | null;
  notes: string | null;
  createdAt: ISODateString;
}

export interface PurchaseOrder {
  id: UUID;
  poNumber: string;
  requirementId: UUID | null;
  requirement?: Requirement;
  vendorId: UUID;
  vendor?: Vendor;
  status: ItemStatus;
  paymentTerms: string | null;
  deliveryAddress: string | null;
  incoterms: string | null;
  totalAmount: number | null;
  taxAmount: number | null;
  discountAmount: number | null;
  currency: string;
  expectedDelivery: ISODateString | null;
  actualDelivery: ISODateString | null;
  rejectionReason: string | null;
  approvedBy: UUID | null;
  approvedAt: ISODateString | null;
  orderedBy: UUID | null;
  orderedAt: ISODateString | null;
  createdBy: UUID;
  notes: string | null;
  items?: PoItem[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Payment {
  id: UUID;
  poId: UUID;
  purchaseOrder?: PurchaseOrder;
  paymentRef: string | null;
  amount: number;
  currency: string;
  paymentDate: ISODateString | null;
  paymentMethod: string | null;
  bankReference: string | null;
  status: ItemStatus;
  processedBy: UUID | null;
  notes: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ------------------------------------------------------------------ //
// Delivery & QC
// ------------------------------------------------------------------ //

export interface DeliveryItem {
  id: UUID;
  deliveryId: UUID;
  poItemId: UUID | null;
  lineNumber: number;
  description: string;
  partNumber: string | null;
  quantityExpected: number;
  quantityReceived: number | null;
  unit: string;
  conditionNotes: string | null;
  isPartial: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Delivery {
  id: UUID;
  deliveryRef: string;
  poId: UUID;
  purchaseOrder?: PurchaseOrder;
  status: ItemStatus;
  supplierDeliveryNote: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  expectedDate: ISODateString | null;
  actualReceivedDate: ISODateString | null;
  receivedBy: UUID | null;
  receivingLocationId: UUID | null;
  notes: string | null;
  items?: DeliveryItem[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface QcDefect {
  id: UUID;
  inspectionId: UUID;
  defectCode: string | null;
  description: string;
  severity: string | null;
  quantityAffected: number | null;
  disposition: string | null;
  createdAt: ISODateString;
}

export interface QcInspection {
  id: UUID;
  inspectionRef: string;
  deliveryId: UUID;
  deliveryItemId: UUID | null;
  inspectorId: UUID | null;
  inspector?: Profile;
  result: QcResult | null;
  status: ItemStatus;
  inspectionDate: ISODateString | null;
  passCriteria: string | null;
  remarks: string | null;
  documents: Record<string, unknown> | null;
  defects?: QcDefect[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ------------------------------------------------------------------ //
// Inventory
// ------------------------------------------------------------------ //

export interface StoreLocation {
  id: UUID;
  code: string;
  name: string;
  warehouse: string | null;
  zone: string | null;
  aisle: string | null;
  rack: string | null;
  bin: string | null;
  capacityKg: number | null;
  isActive: boolean;
  createdAt: ISODateString;
}

export interface InventoryPin {
  id: UUID;
  pinNumber: string;
  description: string;
  partNumber: string | null;
  category: string | null;
  unit: string;
  locationId: UUID | null;
  location?: StoreLocation;
  status: ItemStatus;
  isSerialized: boolean;
  serialNumber: string | null;
  minStockLevel: number | null;
  maxStockLevel: number | null;
  parentPinId: UUID | null;
  derivedFromRecoveryId: UUID | null;
  originType: string | null;
  originReference: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface InventoryTransaction {
  id: UUID;
  pinId: UUID;
  pin?: InventoryPin;
  transactionType: TransactionType;
  quantity: number;
  quantityBefore: number | null;
  quantityAfter: number | null;
  referenceType: string | null;
  referenceId: UUID | null;
  locationId: UUID | null;
  unitCost: number | null;
  notes: string | null;
  actorId: UUID | null;
  actor?: Profile;
  createdAt: ISODateString;
}

export interface MaterialIssue {
  id: UUID;
  issueNumber: string;
  pinId: UUID;
  pin?: InventoryPin;
  issuedTo: UUID;
  issuedToProfile?: Profile;
  vesselId: UUID | null;
  vessel?: Vessel;
  workOrder: string | null;
  quantity: number;
  quantityReturned: number | null;
  unit: string;
  status: ItemStatus;
  purpose: string | null;
  approvedBy: UUID | null;
  approvedAt: ISODateString | null;
  issuedBy: UUID | null;
  issuedAt: ISODateString | null;
  expectedReturnDate: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Recovery {
  id: UUID;
  recoveryRef: string;
  issueId: UUID | null;
  issue?: MaterialIssue;
  pinId: UUID | null;
  pin?: InventoryPin;
  quantityReturned: number;
  outcome: RecoveryOutcome | null;
  status: ItemStatus;
  conditionGrade: string | null;
  conditionNotes: string | null;
  assessedBy: UUID | null;
  assessedAt: ISODateString | null;
  dispositionNotes: string | null;
  derivedPinId: UUID | null;
  derivedPin?: InventoryPin;
  recoveryLocationId: UUID | null;
  recoveredAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ------------------------------------------------------------------ //
// AI / Chat
// ------------------------------------------------------------------ //

export interface ChatSession {
  id: UUID;
  userId: UUID;
  title: string | null;
  context: Record<string, unknown> | null;
  messageCount: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface ChatMessage {
  id: UUID;
  sessionId: UUID;
  role: "user" | "assistant" | "tool" | string;
  content: string;
  toolName: string | null;
  toolCalls: Record<string, unknown> | null;
  tokensUsed: number | null;
  latencyMs: number | null;
  createdAt: ISODateString;
}

export interface Embedding {
  id: UUID;
  entityType: string;
  entityId: UUID;
  content: string;
  embedding: number[] | null;
  model: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface SopDocument {
  id: UUID;
  title: string;
  category: string | null;
  content: string;
  version: string | null;
  effectiveDate: ISODateString | null;
  isActive: boolean;
  createdBy: UUID | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ------------------------------------------------------------------ //
// View / RPC result shapes
// ------------------------------------------------------------------ //

export interface RequirementSummary {
  id: UUID | null;
  refNumber: string | null;
  title: string | null;
  status: string | null;
  urgency: string | null;
  vesselName: string | null;
  departmentName: string | null;
  requestedByName: string | null;
  requiredDate: ISODateString | null;
  budgetEstimate: number | null;
  currency: string | null;
  itemCount: number | null;
  createdAt: ISODateString | null;
  updatedAt: ISODateString | null;
}

export interface PoSummary {
  id: UUID | null;
  poNumber: string | null;
  status: string | null;
  vendorName: string | null;
  vendorCode: string | null;
  requirementRef: string | null;
  totalAmount: number | null;
  taxAmount: number | null;
  discountAmount: number | null;
  currency: string | null;
  expectedDelivery: ISODateString | null;
  actualDelivery: ISODateString | null;
  createdByName: string | null;
  orderedByName: string | null;
  approvedByName: string | null;
  itemCount: number | null;
  createdAt: ISODateString | null;
  updatedAt: ISODateString | null;
}

export interface DeliveryTimeline {
  deliveryId: UUID | null;
  deliveryRef: string | null;
  poNumber: string | null;
  vendorName: string | null;
  status: string | null;
  expectedDate: ISODateString | null;
  actualReceivedDate: ISODateString | null;
  receivedByName: string | null;
  receivingLocation: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  itemCount: number | null;
  createdAt: ISODateString | null;
}

export interface QcSummary {
  inspectionId: UUID | null;
  inspectionRef: string | null;
  deliveryRef: string | null;
  poNumber: string | null;
  inspectorName: string | null;
  result: string | null;
  status: string | null;
  inspectionDate: ISODateString | null;
  defectCount: number | null;
  passCriteria: string | null;
  remarks: string | null;
  createdAt: ISODateString | null;
}

export interface StockBalance {
  pinId: UUID | null;
  pinNumber: string | null;
  description: string | null;
  partNumber: string | null;
  category: string | null;
  unit: string | null;
  locationCode: string | null;
  locationName: string | null;
  currentStock: number | null;
  quantityCommitted: number | null;
  quantityAvailable: number | null;
  minStockLevel: number | null;
  maxStockLevel: number | null;
  isLowStock: boolean | null;
  status: string | null;
}

export interface IssueSummary {
  issueId: UUID | null;
  issueNumber: string | null;
  pinNumber: string | null;
  pinDescription: string | null;
  issuedToName: string | null;
  vesselName: string | null;
  workOrder: string | null;
  quantity: number | null;
  quantityReturned: number | null;
  unit: string | null;
  status: string | null;
  purpose: string | null;
  issuedByName: string | null;
  issuedAt: ISODateString | null;
  expectedReturnDate: ISODateString | null;
  createdAt: ISODateString | null;
}

export interface RecoverySummary {
  recoveryId: UUID | null;
  recoveryRef: string | null;
  issueNumber: string | null;
  pinNumber: string | null;
  pinDescription: string | null;
  quantityReturned: number | null;
  outcome: string | null;
  status: string | null;
  conditionGrade: string | null;
  assessedByName: string | null;
  assessedAt: ISODateString | null;
  derivedPinNumber: string | null;
  recoveryLocation: string | null;
  recoveredAt: ISODateString | null;
  createdAt: ISODateString | null;
}

export interface MaterialGenealogyNode {
  pinId: UUID | null;
  pinNumber: string | null;
  description: string | null;
  originType: string | null;
  originReference: string | null;
  parentPinId: UUID | null;
  parentPinNumber: string | null;
  derivedFromRecoveryId: UUID | null;
  recoveryRef: string | null;
  depth: number | null;
  lineage: string | null;
}

export interface StockAvailability {
  pinId: UUID;
  pinNumber: string;
  description: string;
  currentStock: number;
  quantityCommitted: number;
  quantityAvailable: number;
  locationCode: string | null;
  isLowStock: boolean;
}

export interface EmbeddingMatch {
  id: UUID;
  entityType: string;
  entityId: UUID;
  content: string;
  similarity: number;
}
