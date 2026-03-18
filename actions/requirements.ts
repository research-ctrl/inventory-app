"use server";
import { requireSession } from "@/lib/auth/session";
import { requirementSchema } from "@/lib/validations/requirement";
import { assertCan } from "@/lib/permissions/checks";

export async function createRequirement(formData: FormData) {
  const session = await requireSession();
  assertCan(session.role, "requirement", "create");
  const input = requirementSchema.parse(Object.fromEntries(formData));
  // TODO: insert into DB
  console.log("Creating requirement:", input);
}

export async function approveRequirement(id: string) {
  const session = await requireSession();
  assertCan(session.role, "requirement", "approve");
  // TODO: update status + workflow transition
  console.log("Approving requirement:", id);
}
