import { createClient } from "@/lib/supabase/server";
import { callRpc } from "@/lib/db/rpc";

export async function createPIN(input: {
  description: string;
  part_number?: string;
  category?: string;
  unit: string;
  location_id?: string;
  min_stock_level?: number;
  max_stock_level?: number;
  origin_type: "procurement" | "recovery" | "opening_balance" | "transfer" | "manual";
  origin_reference?: string;
  parent_pin_id?: string;
  is_serialized?: boolean;
  serial_number?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_pins")
    .insert({ ...input, status: "approved" })
    .select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function recordTransaction(input: {
  pin_id: string;
  transaction_type: "receipt" | "issue" | "return" | "adjustment" | "transfer" | "write_off" | "reversal";
  quantity: number;
  reference_type?: string;
  reference_id?: string;
  location_id?: string;
  unit_cost?: number;
  notes?: string;
  actor_id: string;
}) {
  const supabase = await createClient();

  // Get current stock for before/after
  const current = await callRpc<number>("recalculate_pin_quantity", { p_pin_id: input.pin_id });
  const quantity_before = current ?? 0;

  const signedQty =
    ["receipt", "return", "adjustment"].includes(input.transaction_type) && input.quantity > 0
      ? input.quantity
      : ["issue", "transfer", "write_off"].includes(input.transaction_type)
      ? -Math.abs(input.quantity)
      : input.quantity;

  const quantity_after = quantity_before + signedQty;

  const { data, error } = await supabase
    .from("inventory_transactions")
    .insert({
      pin_id: input.pin_id,
      transaction_type: input.transaction_type,
      quantity: signedQty,
      quantity_before,
      quantity_after,
      reference_type: input.reference_type,
      reference_id: input.reference_id,
      location_id: input.location_id,
      unit_cost: input.unit_cost,
      notes: input.notes,
      actor_id: input.actor_id,
    })
    .select().single();
  if (error) throw new Error(error.message);
  return { transaction: data, quantity_before, quantity_after };
}

export async function updatePINLocation(pinId: string, locationId: string, actorId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_pins")
    .update({ location_id: locationId })
    .eq("id", pinId)
    .select().single();
  if (error) throw new Error(error.message);
  await supabase.from("audit_log").insert({
    actor_id: actorId,
    action: "update_location",
    entity_type: "inventory_pin",
    entity_id: pinId,
    new_data: { location_id: locationId },
  });
  return data;
}
