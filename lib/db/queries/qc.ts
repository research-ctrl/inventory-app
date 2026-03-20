import { createClient } from "@/lib/supabase/server";
import { callRpc } from "@/lib/db/rpc";

export interface QCFilters {
  delivery_id?: string;
  result?: string;
  status?: string;
  inspector_id?: string;
  page?: number;
  pageSize?: number;
}

export async function getQCInspections(filters: QCFilters = {}) {
  const supabase = await createClient();
  const { page = 1, pageSize = 20, delivery_id, result, status, inspector_id } = filters;

  let query = supabase
    .from("v_qc_summary")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (delivery_id) query = query.eq("delivery_id", delivery_id);
  if (result) query = query.eq("result", result);
  if (status) query = query.eq("status", status);
  if (inspector_id) query = query.eq("inspector_id", inspector_id);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: data ?? [], total: count ?? 0, page, pageSize };
}

export async function getQCInspectionById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("qc_inspections")
    .select(`
      *,
      qc_defects(*),
      deliveries(id, delivery_ref, purchase_orders(po_number)),
      profiles!qc_inspections_inspector_id_fkey(full_name)
    `)
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getQCSummaryForDelivery(deliveryId: string) {
  return callRpc<Record<string, unknown>[]>("fn_qc_summary", { p_delivery_id: deliveryId });
}
