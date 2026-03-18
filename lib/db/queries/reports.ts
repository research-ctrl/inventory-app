import { createClient } from "@/lib/supabase/server";

// TODO: Implement reports queries
export async function getReportsList() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("reports").select("*");
  if (error) throw new Error(error.message);
  return data;
}
