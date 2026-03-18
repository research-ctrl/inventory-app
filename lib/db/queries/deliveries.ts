import { createClient } from "@/lib/supabase/server";

// TODO: Implement deliveries queries
export async function getDeliveriesList() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("deliveries").select("*");
  if (error) throw new Error(error.message);
  return data;
}
