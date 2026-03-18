import { createClient } from "@/lib/supabase/server";

export async function callRpc<T>(
  fn: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, params);
  if (error) throw new Error(error.message);
  return data as T;
}
