import { createClient } from "@/lib/supabase/server";
import { callRpc } from "@/lib/db/rpc";

export interface RecoveryFilters {
  status?: string;
  outcome?: string;
  issue_id?: string;
  page?: number;
  pageSize?: number;
}

export async function getRecoveries(filters: RecoveryFilters = {}) {
  const supabase = await createClient();
  const { page = 1, pageSize = 20, status, outcome, issue_id } = filters;

  let query = supabase
    .from("v_recovery_summary")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status) query = query.eq("status", status);
  if (outcome) query = query.eq("outcome", outcome);
  if (issue_id) query = query.eq("issue_id", issue_id);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: data ?? [], total: count ?? 0, page, pageSize };
}

export async function getRecoveryById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recoveries")
    .select(`
      *,
      material_issues(id, issue_number, quantity, vessel_id, vessels(name)),
      pin:inventory_pins!recoveries_pin_id_fkey(id, pin_number, description),
      derived_pin:inventory_pins!recoveries_derived_pin_id_fkey(id, pin_number, description),
      assessed_by_profile:profiles!recoveries_assessed_by_fkey(full_name),
      store_locations!recoveries_recovery_location_id_fkey(code, name)
    `)
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getRecoveryStatusForIssue(issueId: string) {
  return callRpc<Record<string, unknown>[]>("fn_recovery_status", { p_issue_id: issueId });
}
