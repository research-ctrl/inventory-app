"use server";
import { requireSession } from "@/lib/auth/session";
import { recoverySchema } from "@/lib/validations/recovery";
import { assertCan } from "@/lib/permissions/checks";

export async function createRecovery(formData: FormData) {
  const session = await requireSession();
  assertCan(session.role, "recovery", "create");
  const input = recoverySchema.parse(Object.fromEntries(formData));
  console.log("Creating recovery:", input);
}
