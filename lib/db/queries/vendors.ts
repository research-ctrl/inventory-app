import { createClient } from "@/lib/supabase/server";

// TODO: Implement vendors queries
export async function getVendorsList() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("vendors").select("*");
  if (error) throw new Error(error.message);
  return data;
}
