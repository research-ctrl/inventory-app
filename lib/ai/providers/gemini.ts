import type { AIRequest } from "../provider-router";
import { GoogleGenerativeAI, DynamicRetrievalMode } from "@google/generative-ai";

export async function generateWithGemini(request: AIRequest): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
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

  // Convert messages to Gemini format
  const systemInstruction = request.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n");

  const chatMessages = request.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }));

  const chat = model.startChat({
    systemInstruction,
    history: chatMessages.slice(0, -1),
  });

  const lastMessage = chatMessages[chatMessages.length - 1];
  const result = await chat.sendMessage(lastMessage.parts[0].text);
  const response = result.response;

  return response.text();
}
