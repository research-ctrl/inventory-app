export type UUID = string;
export type ISODateString = string;

export type Status =
  | "draft" | "pending" | "approved" | "rejected"
  | "in_progress" | "completed" | "cancelled" | "on_hold";

export type UrgencyLevel = "routine" | "urgent" | "critical";
export type QCResult = "pass" | "fail" | "conditional";
export type RecoveryOutcome = "reuse" | "repair" | "scrap" | "sell";

export interface Requirement {
  id: UUID;
  ref_number: string;
  title: string;
  description: string;
  vessel_name: string;
  department: string;
  requested_by: UUID;
  urgency: UrgencyLevel;
  status: Status;
  required_date: ISODateString;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface Vendor {
  id: UUID;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  rating: number;
  is_approved: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface PurchaseOrder {
  id: UUID;
  po_number: string;
  requirement_id: UUID;
  vendor_id: UUID;
  status: Status;
  total_amount: number;
  currency: string;
  expected_delivery: ISODateString;
  created_by: UUID;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface Delivery {
  id: UUID;
  po_id: UUID;
  delivery_ref: string;
  status: Status;
  delivered_at: ISODateString | null;
  received_by: UUID | null;
  notes: string;
  created_at: ISODateString;
}

export interface QCInspection {
  id: UUID;
  delivery_id: UUID;
  inspector_id: UUID;
  result: QCResult;
  remarks: string;
  inspected_at: ISODateString;
  created_at: ISODateString;
}

export interface InventoryPin {
  id: UUID;
  pin_number: string;
  description: string;
  location_id: UUID;
  quantity: number;
  unit: string;
  status: Status;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface Issue {
  id: UUID;
  issue_number: string;
  pin_id: UUID;
  issued_to: UUID;
  quantity: number;
  vessel_name: string;
  work_order: string;
  status: Status;
  issued_at: ISODateString | null;
  created_at: ISODateString;
}

export interface Recovery {
  id: UUID;
  issue_id: UUID;
  pin_id: UUID;
  quantity_returned: number;
  outcome: RecoveryOutcome;
  assessed_by: UUID;
  status: Status;
  recovered_at: ISODateString | null;
  created_at: ISODateString;
}
