import type { AIRequest } from "../provider-router";

// Groq — ultra-fast inference with Llama/Mixtral models via OpenAI-compatible API
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export async function generateWithGrok(request: AIRequest): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.startsWith("your-")) {
    throw new Error("GROQ_API_KEY is not configured. Please add a valid Groq API key.");
  }

  const messages = request.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned an empty response");
  return content;
}
