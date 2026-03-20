import { createClient } from "@/lib/supabase/server";
import { recordTransaction } from "./inventory";

export async function createIssue(input: {
  pin_id: string;
  issued_to: string;
  vessel_id?: string;
  work_order?: string;
  quantity: number;
  unit: string;
  purpose?: string;
  expected_return_date?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("material_issues")
    .insert({ ...input, status: "draft" })
    .select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function submitIssue(id: string, actorId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("material_issues")
    .update({ status: "pending_approval" })
    .eq("id", id).eq("status", "draft")
    .select().single();
  if (error) throw new Error(error.message);
  await supabase.from("workflow_history").insert({
    entity_type: "material_issue", entity_id: id,
    from_status: "draft", to_status: "pending_approval",
    event: "submit", actor_id: actorId,
  });
  return data;
}

export async function approveIssue(id: string, actorId: string, comment?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("material_issues")
    .update({ status: "approved", approved_by: actorId, approved_at: new Date().toISOString() })
    .eq("id", id).eq("status", "pending_approval")
    .select().single();
  if (error) throw new Error(error.message);
  await supabase.from("workflow_history").insert({
    entity_type: "material_issue", entity_id: id,
    from_status: "pending_approval", to_status: "approved",
    event: "approve", actor_id: actorId, comment,
  });
  return data;
}

export async function issueToVessel(id: string, actorId: string) {
  const supabase = await createClient();
  const { data: issue, error: fetchError } = await supabase
    .from("material_issues")
    .select("pin_id, quantity, unit")
    .eq("id", id).eq("status", "approved")
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const { data, error } = await supabase
    .from("material_issues")
    .update({ status: "issued", issued_by: actorId, issued_at: new Date().toISOString() })
    .eq("id", id)
    .select().single();
  if (error) throw new Error(error.message);

  await recordTransaction({
    pin_id: issue.pin_id,
    transaction_type: "issue",
    quantity: issue.quantity,
    reference_type: "material_issue",
    reference_id: id,
    actor_id: actorId,
    notes: `Issued via material issue ${id}`,
  });

  await supabase.from("workflow_history").insert({
    entity_type: "material_issue", entity_id: id,
    from_status: "approved", to_status: "issued",
    event: "issue_material", actor_id: actorId,
  });
  return data;
}
