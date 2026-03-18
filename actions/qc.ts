"use server";
import { requireSession } from "@/lib/auth/session";
import { qcInspectionSchema } from "@/lib/validations/qc";
import { assertCan } from "@/lib/permissions/checks";

export async function submitInspection(formData: FormData) {
  const session = await requireSession();
  assertCan(session.role, "qc_inspection", "create");
  const input = qcInspectionSchema.parse(Object.fromEntries(formData));
  console.log("Submitting inspection:", input);
}
