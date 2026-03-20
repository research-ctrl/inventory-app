import { env } from "@/lib/env";

export type AIProvider = "gemini" | "grok" | "mistral";

export interface AIRequest {
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  tools?: unknown[];
}

export async function routeToProvider(
  request: AIRequest,
  provider?: AIProvider
): Promise<string> {
  const active = provider ?? (env.AI_DEFAULT_PROVIDER as AIProvider);

  if (active === "gemini") {
    const { generateWithGemini } = await import("./providers/gemini");
    return generateWithGemini(request);
  }

  if (active === "mistral") {
    const { generateWithMistral } = await import("./providers/mistral");
    return generateWithMistral(request);
  }

  // grok
  const { generateWithGrok } = await import("./providers/grok");
  return generateWithGrok(request);
}
