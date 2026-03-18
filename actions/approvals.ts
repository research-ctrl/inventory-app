"use server";
import { requireSession } from "@/lib/auth/session";
import { assertCan } from "@/lib/permissions/checks";

export async function approveItem(id: string, comment?: string) {
  const session = await requireSession();
  assertCan(session.role, "approval", "approve");
  console.log("Approving item:", id, comment);
}

export async function rejectItem(id: string, comment: string) {
  const session = await requireSession();
  assertCan(session.role, "approval", "reject");
  console.log("Rejecting item:", id, comment);
}
