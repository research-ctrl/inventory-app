import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
// Database type is kept in @/types/database for reference.
// We use an untyped client here until `supabase gen types` can be run against
// the live schema. This avoids false-positive `never` inference when the
// schema hasn't been deployed yet.
import { env } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: {name: string; value: string; options: any}[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }: {name: string; value: string; options: any}) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore in Server Components; middleware handles refresh
          }
        },
      },
    }
  );
}
