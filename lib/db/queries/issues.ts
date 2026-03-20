import { createClient } from "@/lib/supabase/server";

export interface IssueFilters {
  status?: string;
  pin_id?: string;
  issued_to?: string;
  vessel_id?: string;
  page?: number;
  pageSize?: number;
}

export async function getIssues(filters: IssueFilters = {}) {
  const supabase = await createClient();
  const { page = 1, pageSize = 20, status, pin_id, issued_to, vessel_id } = filters;

  let query = supabase
    .from("v_issue_summary")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status) query = query.eq("status", status);
  if (pin_id) query = query.eq("pin_id", pin_id);
  if (issued_to) query = query.eq("issued_to", issued_to);
  if (vessel_id) query = query.eq("vessel_id", vessel_id);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: data ?? [], total: count ?? 0, page, pageSize };
}

export async function getIssueById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("material_issues")
    .select(`
      *,
      inventory_pins(id, pin_number, description, unit),
      vessels(id, name),
      issued_to_profile:profiles!material_issues_issued_to_fkey(full_name, email),
      approved_by_profile:profiles!material_issues_approved_by_fkey(full_name),
      issued_by_profile:profiles!material_issues_issued_by_fkey(full_name),
      recoveries(*)
    `)
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}
