import type { AIRequest } from "../provider-router";
import { GoogleGenerativeAI, DynamicRetrievalMode } from "@google/generative-ai";

export async function generateWithGemini(request: AIRequest): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const genAI = new GoogleGenerativeAI(apiKey);

  // Extract system instruction from messages
  const systemText = request.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n");

  // System instruction MUST be in getGenerativeModel (not startChat) to avoid
  // the "Invalid value at system_instruction" 400 error from the Gemini API.
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: {
      role: "user",
      parts: [{ text: systemText }],
    },
    tools: [
      {
        googleSearchRetrieval: {
          dynamicRetrievalConfig: {
            mode: DynamicRetrievalMode.MODE_DYNAMIC,
            dynamicThreshold: 0.3,
          },
        },
      },
    ],
  });

  // Convert non-system messages to Gemini format
  const chatMessages = request.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }));

  const chat = model.startChat({
    history: chatMessages.slice(0, -1),
  });

  const lastMessage = chatMessages[chatMessages.length - 1];
  const result = await chat.sendMessage(lastMessage.parts[0].text);

  return result.response.text();
}
