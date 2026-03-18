import { createClient } from "@/lib/supabase/server";

// TODO: Implement inventory queries
export async function getInventoryList() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("inventory").select("*");
  if (error) throw new Error(error.message);
  return data;
}
