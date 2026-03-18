"use server";
import { requireSession } from "@/lib/auth/session";
import { chatMessageSchema } from "@/lib/validations/chat";
import { routeToProvider } from "@/lib/ai/provider-router";
import { applyGuardrails } from "@/lib/ai/guardrails";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";

export async function sendChatMessage(formData: FormData) {
  await requireSession();
  const { message } = chatMessageSchema.parse(Object.fromEntries(formData));
  const guard = applyGuardrails(message);
  if (!guard.allowed) {
    return { error: guard.reason };
  }
  const response = await routeToProvider({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: message },
    ],
  });
  return { response };
}
