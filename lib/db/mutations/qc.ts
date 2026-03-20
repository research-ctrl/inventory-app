import { createClient } from "@/lib/supabase/server";

export async function createQCInspection(input: {
  delivery_id: string;
  delivery_item_id?: string;
  inspector_id: string;
  pass_criteria?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("qc_inspections")
    .insert({ ...input, status: "qc_pending" })
    .select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function startInspection(id: string, actorId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("qc_inspections")
    .update({ status: "in_progress", inspection_date: new Date().toISOString() })
    .eq("id", id).eq("status", "qc_pending")
    .select().single();
  if (error) throw new Error(error.message);
  await supabase.from("workflow_history").insert({
    entity_type: "qc_inspection", entity_id: id,
    from_status: "qc_pending", to_status: "in_progress",
    event: "start_inspection", actor_id: actorId,
  });
  return data;
}

export async function submitInspectionResult(
  id: string,
  actorId: string,
  result: "pass" | "fail" | "conditional",
  remarks?: string,
  defects?: Array<{
    defect_code?: string;
    description: string;
    severity: "minor" | "major" | "critical";
    quantity_affected?: number;
    disposition?: string;
  }>
) {
  const supabase = await createClient();
  const toStatus = result === "pass" ? "qc_passed" : result === "fail" ? "qc_failed" : "qc_conditional";
  const fromStatus = "in_progress";

  const { data, error } = await supabase
    .from("qc_inspections")
    .update({ result, status: toStatus, remarks })
    .eq("id", id)
    .select().single();
  if (error) throw new Error(error.message);

  if (defects && defects.length > 0) {
    const { error: defectError } = await supabase
      .from("qc_defects")
      .insert(defects.map(d => ({ ...d, inspection_id: id })));
    if (defectError) throw new Error(defectError.message);
  }

  await supabase.from("workflow_history").insert({
    entity_type: "qc_inspection", entity_id: id,
    from_status: fromStatus, to_status: toStatus,
    event: result === "pass" ? "pass_inspection" : result === "fail" ? "fail_inspection" : "conditional_inspection",
    actor_id: actorId, comment: remarks,
  });

  return data;
}
