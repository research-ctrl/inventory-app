import { createClient } from "@/lib/supabase/server";

// TODO: Implement qc queries
export async function getQcList() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("qc").select("*");
  if (error) throw new Error(error.message);
  return data;
}
