"use server";
import { requireSession } from "@/lib/auth/session";
import { assertCan } from "@/lib/permissions/checks";

export async function adjustStock(pinId: string, delta: number, reason: string) {
  const session = await requireSession();
  assertCan(session.role, "inventory", "update");
  console.log("Adjusting stock:", pinId, delta, reason);
}
