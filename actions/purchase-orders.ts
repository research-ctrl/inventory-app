"use server";
import { requireSession } from "@/lib/auth/session";
import { purchaseOrderSchema } from "@/lib/validations/po";
import { assertCan } from "@/lib/permissions/checks";

export async function createPurchaseOrder(formData: FormData) {
  const session = await requireSession();
  assertCan(session.role, "purchase_order", "create");
  const input = purchaseOrderSchema.parse(Object.fromEntries(formData));
  console.log("Creating PO:", input);
}
