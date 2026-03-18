import { createClient } from "@/lib/supabase/server";

// TODO: Implement issues queries
export async function getIssuesList() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("issues").select("*");
  if (error) throw new Error(error.message);
  return data;
}
