export const APP_NAME = "Shipyard Material Lifecycle System";
export const APP_SHORT_NAME = "SMLS";

export const ROUTES = {
  HOME: "/",
  SIGN_IN: "/sign-in",
  SIGN_UP: "/sign-up",
  DASHBOARD: "/dashboard",
  REQUIREMENTS: "/requirements",
  APPROVALS: "/approvals",
  VENDORS: "/vendors",
  PROCUREMENT: {
    POS: "/procurement/purchase-orders",
    PAYMENTS: "/procurement/payments",
    DELIVERIES: "/procurement/deliveries",
  },
  RECEIVING: "/receiving",
  QC: "/qc",
  INVENTORY: "/inventory",
  ISSUES: "/issues",
  RECOVERY: "/recovery",
  CHATBOT: "/chatbot",
  REPORTS: "/reports",
  SETTINGS: "/settings",
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-700",
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-gray-100 text-gray-500",
  on_hold: "bg-orange-100 text-orange-700",
} as const;
