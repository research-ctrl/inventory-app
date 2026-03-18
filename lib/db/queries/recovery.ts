import { createClient } from "@/lib/supabase/server";

// TODO: Implement recovery queries
export async function getRecoveryList() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("recovery").select("*");
  if (error) throw new Error(error.message);
  return data;
}
