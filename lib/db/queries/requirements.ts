import { createClient } from "@/lib/supabase/server";

// TODO: Implement requirements queries
export async function getRequirementsList() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("requirements").select("*");
  if (error) throw new Error(error.message);
  return data;
}
