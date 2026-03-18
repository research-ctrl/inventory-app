import type { AIRequest } from "../provider-router";

export async function generateWithGrok(request: AIRequest): Promise<string> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) throw new Error("GROK_API_KEY not configured");
  // TODO: Implement Grok API call
  console.log("Grok request:", request.messages.length, "messages");
  return "Grok response placeholder";
}
