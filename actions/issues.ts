"use server";
import { requireSession } from "@/lib/auth/session";
import { issueSchema } from "@/lib/validations/issue";
import { assertCan } from "@/lib/permissions/checks";

export async function createIssue(formData: FormData) {
  const session = await requireSession();
  assertCan(session.role, "issue", "create");
  const input = issueSchema.parse(Object.fromEntries(formData));
  console.log("Creating issue:", input);
}
