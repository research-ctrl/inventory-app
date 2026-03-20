import { createClient } from "@/lib/supabase/server";

export async function getDashboardStats() {
  const supabase = await createClient();

  const [
    { count: openRequirements },
    { count: pendingApprovals },
    { count: activePOs },
    { count: pendingDeliveries },
    { count: qcQueue },
    { count: lowStockItems },
  ] = await Promise.all([
    supabase.from("requirements").select("*", { count: "exact", head: true })
      .in("status", ["draft", "pending_approval", "approved", "in_progress"]),
    supabase.from("approvals").select("*", { count: "exact", head: true })
      .eq("status", "pending_approval"),
    supabase.from("purchase_orders").select("*", { count: "exact", head: true })
      .in("status", ["approved", "ordered", "partially_delivered"]),
    supabase.from("deliveries").select("*", { count: "exact", head: true })
      .in("status", ["pending_approval", "received", "qc_pending"]),
    supabase.from("qc_inspections").select("*", { count: "exact", head: true })
      .in("status", ["qc_pending"]),
    supabase.from("v_inventory_status").select("*", { count: "exact", head: true })
      .eq("is_low_stock", true),
  ]);

  return {
    openRequirements: openRequirements ?? 0,
    pendingApprovals: pendingApprovals ?? 0,
    activePOs: activePOs ?? 0,
    pendingDeliveries: pendingDeliveries ?? 0,
    qcQueue: qcQueue ?? 0,
    lowStockItems: lowStockItems ?? 0,
  };
}

export async function getWorkflowHistoryForEntity(entityType: string, entityId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workflow_history")
    .select("*, profiles!workflow_history_actor_id_fkey(full_name, email)")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getRecentActivity(limit = 20) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workflow_history")
    .select("*, profiles!workflow_history_actor_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}
