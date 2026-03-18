import { createClient } from "@/lib/supabase/server";

// TODO: Implement purchase_orders queries
export async function getPurchaseOrdersList() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("purchase_orders").select("*");
  if (error) throw new Error(error.message);
  return data;
}
