import { ChatInterface } from "@/components/chatbot/chat-interface";

export const metadata = { title: "AI Assistant | SMLS" };

export default function ChatbotPage() {
  return (
    <div className="h-full">
      <ChatInterface />
    </div>
  );
}
