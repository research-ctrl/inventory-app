import { createBrowserClient } from "@supabase/ssr";
// Untyped until `supabase gen types` runs against the live schema.
import { env } from "@/lib/env";

export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
