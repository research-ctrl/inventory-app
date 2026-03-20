import { createClient } from "@/lib/supabase/server";
import { recordTransaction } from "./inventory";

export async function createRecovery(input: {
  issue_id: string;
  pin_id: string;
  quantity_returned: number;
  recovery_location_id?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recoveries")
    .insert({ ...input, status: "pending_assessment" })
    .select().single();
  if (error) throw new Error(error.message);

  await supabase.from("workflow_history").insert({
    entity_type: "recovery", entity_id: data.id,
    from_status: "pending_assessment", to_status: "pending_assessment",
    event: "submit", actor_id: input.pin_id,
  });
  return data;
}

export async function assessRecovery(
  id: string,
  actorId: string,
  assessment: {
    outcome: "reuse" | "repair" | "scrap" | "sell";
    condition_grade: "A" | "B" | "C" | "D" | "scrap";
    condition_notes?: string;
    disposition_notes?: string;
  }
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recoveries")
    .update({
      ...assessment,
      status: "assessed",
      assessed_by: actorId,
      assessed_at: new Date().toISOString(),
    })
    .eq("id", id).eq("status", "pending_assessment")
    .select().single();
  if (error) throw new Error(error.message);
  await supabase.from("workflow_history").insert({
    entity_type: "recovery", entity_id: id,
    from_status: "pending_assessment", to_status: "assessed",
    event: "assess", actor_id: actorId,
    comment: assessment.condition_notes,
  });
  return data;
}

export async function completeRecoveryWithReuse(
  id: string,
  actorId: string,
  newPinData?: {
    description: string;
    unit: string;
    location_id: string;
    category?: string;
  }
) {
  const supabase = await createClient();
  const { data: rec } = await supabase.from("recoveries").select("pin_id, quantity_returned").eq("id", id).single();
  if (!rec) throw new Error("Recovery not found");

  let derivedPinId: string | null = null;

  if (newPinData) {
    // Create a derived PIN for the returned material
    const { data: newPin, error: pinError } = await supabase
      .from("inventory_pins")
      .insert({
        ...newPinData,
        parent_pin_id: rec.pin_id,
        origin_type: "recovery",
        origin_reference: id,
        status: "approved",
      })
      .select().single();
    if (pinError) throw new Error(pinError.message);
    derivedPinId = newPin.id;

    await recordTransaction({
      pin_id: newPin.id,
      transaction_type: "return",
      quantity: rec.quantity_returned,
      reference_type: "recovery",
      reference_id: id,
      actor_id: actorId,
      notes: `Material recovered and re-entered stock via ${id}`,
    });
  }

  const { data, error } = await supabase
    .from("recoveries")
    .update({ status: "assessed", derived_pin_id: derivedPinId, recovered_at: new Date().toISOString() })
    .eq("id", id)
    .select().single();
  if (error) throw new Error(error.message);

  if (derivedPinId) {
    await supabase.from("inventory_pins")
      .update({ derived_from_recovery_id: id })
      .eq("id", derivedPinId);
  }

  await supabase.from("workflow_history").insert({
    entity_type: "recovery", entity_id: id,
    from_status: "assessed", to_status: "assessed",
    event: "mark_reuse", actor_id: actorId,
    metadata: { derived_pin_id: derivedPinId },
  });
  return { recovery: data, derivedPinId };
}

export async function scrapRecovery(id: string, actorId: string, notes?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recoveries")
    .update({ status: "scrapped", disposition_notes: notes })
    .eq("id", id).in("status", ["assessed", "pending_assessment"])
    .select().single();
  if (error) throw new Error(error.message);
  await supabase.from("workflow_history").insert({
    entity_type: "recovery", entity_id: id,
    from_status: "assessed", to_status: "scrapped",
    event: "scrap_material", actor_id: actorId, comment: notes,
  });
  return data;
}
