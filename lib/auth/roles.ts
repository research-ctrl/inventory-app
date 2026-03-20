export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  PROCUREMENT_MANAGER: "procurement_manager",
  PROCUREMENT_OFFICER: "procurement_officer",
  STORE_MANAGER: "store_manager",
  STORE_KEEPER: "store_keeper",
  QC_INSPECTOR: "qc_inspector",
  ENGINEER: "engineer",
  APPROVER: "approver",
  FINANCE: "finance",
  SHIPBUILDER: "shipbuilder",
  VIEWER: "viewer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  procurement_manager: "Procurement Manager",
  procurement_officer: "Procurement Officer",
  store_manager: "Store Manager",
  store_keeper: "Store Keeper",
  qc_inspector: "QC Inspector",
  engineer: "Engineer",
  approver: "Approver",
  finance: "Finance",
  shipbuilder: "Shipbuilder",
  viewer: "Viewer",
};

export const ROLE_HIERARCHY: Record<Role, number> = {
  super_admin: 100,
  admin: 90,
  procurement_manager: 70,
  store_manager: 70,
  approver: 60,
  finance: 55,
  procurement_officer: 50,
  store_keeper: 50,
  qc_inspector: 50,
  engineer: 40,
  shipbuilder: 30,
  viewer: 10,
};

export function hasHigherRole(roleA: Role, roleB: Role): boolean {
  return ROLE_HIERARCHY[roleA] > ROLE_HIERARCHY[roleB];
}
