import { createClient } from "@/lib/supabase/server";

/**
 * Fetches a read-only snapshot of the entire SMLS system state.
 * This gets injected into the AI's system prompt so it has full visibility.
 * ALL queries are SELECT-only — no write access.
 */
export async function getDatabaseContext(): Promise<string> {
  const supabase = await createClient();

  // ─── Requirements ────────────────────────────────────────────────────────
  const { data: requirements } = await supabase
    .from("requirements")
    .select("id, ref_number, title, status, urgency, vessel_id, department_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  // ─── Purchase Orders ─────────────────────────────────────────────────────
  const { data: purchaseOrders } = await supabase
    .from("purchase_orders")
    .select("id, po_number, vendor_id, status, total_amount, currency, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  // ─── Deliveries ──────────────────────────────────────────────────────────
  const { data: deliveries } = await supabase
    .from("deliveries")
    .select("id, delivery_number, po_id, status, expected_date, actual_date, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  // ─── Vendors ─────────────────────────────────────────────────────────────
  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, name, code, is_approved, blacklisted, rating")
    .order("name")
    .limit(50);

  // ─── Inventory (stock balances) ──────────────────────────────────────────
  const { data: inventory } = await supabase
    .from("inventory_pins")
    .select("id, pin_number, description, category, unit, current_stock, min_stock_level, status, location_id")
    .order("pin_number")
    .limit(100);

  // ─── QC Inspections ─────────────────────────────────────────────────────
  const { data: inspections } = await supabase
    .from("qc_inspections")
    .select("id, inspection_number, delivery_item_id, result, inspector_id, inspection_date, notes")
    .order("inspection_date", { ascending: false })
    .limit(30);

  // ─── Issues ──────────────────────────────────────────────────────────────
  const { data: issues } = await supabase
    .from("material_issues")
    .select("id, issue_number, pin_id, quantity, issued_to, status, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  // ─── Recovery ────────────────────────────────────────────────────────────
  const { data: recovery } = await supabase
    .from("material_recovery")
    .select("id, pin_id, quantity, outcome, status, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  // ─── Vessels ─────────────────────────────────────────────────────────────
  const { data: vessels } = await supabase
    .from("vessels")
    .select("id, name, imo_number, vessel_type, is_active")
    .order("name");

  // ─── Departments ────────────────────────────────────────────────────────
  const { data: departments } = await supabase
    .from("departments")
    .select("id, code, name, is_active")
    .order("name");

  // ─── Summary statistics ──────────────────────────────────────────────────
  const { count: totalReqs } = await supabase
    .from("requirements")
    .select("*", { count: "exact", head: true });

  const { count: pendingReqs } = await supabase
    .from("requirements")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending_approval");

  const { count: totalPOs } = await supabase
    .from("purchase_orders")
    .select("*", { count: "exact", head: true });

  const { count: totalDeliveries } = await supabase
    .from("deliveries")
    .select("*", { count: "exact", head: true });

  const { count: totalInventory } = await supabase
    .from("inventory_pins")
    .select("*", { count: "exact", head: true });

  // ─── Build context string ───────────────────────────────────────────────
  return `
=== CURRENT SYSTEM STATE (READ-ONLY SNAPSHOT) ===

SUMMARY:
- Total Requirements: ${totalReqs ?? 0} (${pendingReqs ?? 0} pending approval)
- Total Purchase Orders: ${totalPOs ?? 0}
- Total Deliveries: ${totalDeliveries ?? 0}
- Total Inventory PINs: ${totalInventory ?? 0}
- Registered Vendors: ${(vendors ?? []).length}
- Active Vessels: ${(vessels ?? []).filter((v: any) => v.is_active).length}
- Active Departments: ${(departments ?? []).filter((d: any) => d.is_active).length}

VESSELS:
${JSON.stringify(vessels ?? [], null, 2)}

DEPARTMENTS:
${JSON.stringify(departments ?? [], null, 2)}

RECENT REQUIREMENTS (latest 50):
${JSON.stringify(requirements ?? [], null, 2)}

PURCHASE ORDERS (latest 50):
${JSON.stringify(purchaseOrders ?? [], null, 2)}

VENDORS:
${JSON.stringify(vendors ?? [], null, 2)}

DELIVERIES (latest 50):
${JSON.stringify(deliveries ?? [], null, 2)}

INVENTORY PINS (first 100):
${JSON.stringify(inventory ?? [], null, 2)}

QC INSPECTIONS (latest 30):
${JSON.stringify(inspections ?? [], null, 2)}

MATERIAL ISSUES (latest 30):
${JSON.stringify(issues ?? [], null, 2)}

MATERIAL RECOVERY (latest 30):
${JSON.stringify(recovery ?? [], null, 2)}
`;
}
