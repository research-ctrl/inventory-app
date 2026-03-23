import type { AIRequest } from "../provider-router";

// Nvidia API Catalog — compatible with OpenAI API format
// Uses Nvidia's inference endpoints for various open models
const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODEL = "meta/llama-3.1-405b-instruct"; // Can also use: llama-3.1-70b-instruct, mistral-7b-instruct-v0.3, etc.

export async function generateWithNvidia(request: AIRequest): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey || apiKey.startsWith("your-")) {
    throw new Error("NVIDIA_API_KEY is not configured. Get one from https://build.nvidia.com/");
  }

  // Extract system instruction
  const systemMessage = request.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n");

  // Prepare messages in OpenAI format
  const messages = request.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const payload: any = {
    model: NVIDIA_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 4096,
  };

  if (systemMessage) {
    // Add system message if not already in messages
    if (!messages.some((m) => m.role === "system")) {
      payload.messages.unshift({
        role: "system",
        content: systemMessage,
      });
    }
  }

  const response = await fetch(NVIDIA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Nvidia API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Nvidia returned an empty response");
  return content;
}
