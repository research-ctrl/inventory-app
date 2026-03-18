import type { AIRequest } from "../provider-router";

export async function generateWithGemini(request: AIRequest): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  // TODO: Implement Gemini API call
  console.log("Gemini request:", request.messages.length, "messages");
  return "Gemini response placeholder";
}
