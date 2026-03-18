"use server";
import { requireSession } from "@/lib/auth/session";
import { assertCan } from "@/lib/permissions/checks";

export async function recordDelivery(id: string) {
  const session = await requireSession();
  assertCan(session.role, "delivery", "update");
  console.log("Recording delivery:", id);
}
