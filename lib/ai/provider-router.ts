import { env } from "@/lib/env";

export type AIProvider = "gemini" | "groq" | "mistral" | "nvidia";

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

  if (active === "nvidia") {
    const { generateWithNvidia } = await import("./providers/nvidia");
    return generateWithNvidia(request);
  }

  // groq (default fallback)
  const { generateWithGrok } = await import("./providers/grok");
  return generateWithGrok(request);
}
