import { env } from "@/lib/env";

export type AIProvider = "gemini" | "grok";

export interface AIRequest {
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  tools?: unknown[];
}

export async function routeToProvider(
  request: AIRequest,
  provider?: AIProvider
): Promise<string> {
  const active = provider ?? env.AI_DEFAULT_PROVIDER;
  if (active === "gemini") {
    const { generateWithGemini } = await import("./providers/gemini");
    return generateWithGemini(request);
  }
  const { generateWithGrok } = await import("./providers/grok");
  return generateWithGrok(request);
}
