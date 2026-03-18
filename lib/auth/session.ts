import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import type { Role } from "./roles";

export interface Session {
  user: User;
  role: Role;
}

export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Role is stored in user metadata or a separate profiles table
  const role = (user.user_metadata?.role ?? "viewer") as Role;
  return { user, role };
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");
  return session;
}
