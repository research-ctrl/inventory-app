"use client";
import { useState, useCallback } from "react";
import { sendChatMessage } from "@/actions/chatbot";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const send = useCallback(async (content: string) => {
    setMessages((prev) => [...prev, { role: "user", content }]);
    setLoading(true);
    const formData = new FormData();
    formData.append("message", content);
    const result = await sendChatMessage(formData);
    const assistantMsg = result.response ?? result.error ?? "Error";
    setMessages((prev) => [...prev, { role: "assistant", content: assistantMsg }]);
    setLoading(false);
  }, []);

  return { messages, loading, send };
}
