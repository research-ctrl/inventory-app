"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, Trash2, ChevronDown } from "lucide-react";

type AIProvider = "gemini" | "groq" | "mistral";

interface ProviderOption {
  id: AIProvider;
  label: string;
  description: string;
  color: string;
  dot: string;
}

const PROVIDERS: ProviderOption[] = [
  {
    id: "gemini",
    label: "Gemini 2.0 Flash",
    description: "Google · Web search enabled",
    color: "text-blue-700",
    dot: "bg-blue-500",
  },
  {
    id: "mistral",
    label: "Mistral Large",
    description: "Mistral AI · Fast & accurate",
    color: "text-orange-700",
    dot: "bg-orange-500",
  },
  {
    id: "groq",
    label: "Groq · Llama 3.3",
    description: "Groq · Ultra-fast inference",
    color: "text-purple-700",
    dot: "bg-purple-500",
  },
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  provider?: AIProvider;
}

function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs">$1</code>')
    .replace(/^### (.*$)/gm, '<h3 class="font-semibold text-base mt-3 mb-1">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="font-semibold text-lg mt-3 mb-1">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="font-bold text-xl mt-3 mb-1">$1</h1>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n/g, "<br />");
}

function ProviderBadge({ provider }: { provider: AIProvider }) {
  const opt = PROVIDERS.find((p) => p.id === provider);
  if (!opt) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-medium text-gray-400 mt-1">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${opt.dot}`} />
      {opt.label}
    </span>
  );
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("groq");
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close provider menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProviderMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          provider: selectedProvider,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        provider: selectedProvider,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `❌ Error: ${error.message}. Please try again.`,
        timestamp: new Date(),
        provider: selectedProvider,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function clearChat() {
    setMessages([]);
  }

  const activeProvider = PROVIDERS.find((p) => p.id === selectedProvider)!;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-md">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">SMLS AI Assistant</h2>
            <p className="text-xs text-gray-500">Read-only access · Internet search enabled</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Model Selector */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setProviderMenuOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              <span className={`w-2 h-2 rounded-full ${activeProvider.dot}`} />
              {activeProvider.label}
              <ChevronDown className="h-3 w-3 text-gray-400" />
            </button>

            {providerMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                <p className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  Select AI Model
                </p>
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProvider(p.id);
                      setProviderMenuOpen(false);
                    }}
                    className={`w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                      selectedProvider === p.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${p.dot}`} />
                    <div>
                      <p className={`text-xs font-medium ${p.color}`}>{p.label}</p>
                      <p className="text-[10px] text-gray-400">{p.description}</p>
                    </div>
                    {selectedProvider === p.id && (
                      <span className="ml-auto text-blue-600 text-xs">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 mb-4">
              <Bot className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              How can I help you today?
            </h3>
            <p className="text-sm text-gray-500 max-w-md mb-6">
              I have read-only access to the entire SMLS system. Ask me about inventory,
              requirements, purchase orders, deliveries, QC, and more.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {[
                "What's the current inventory status?",
                "Show me pending requirements",
                "Which vendors are approved?",
                "Any overdue deliveries?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion);
                    inputRef.current?.focus();
                  }}
                  className="text-left px-4 py-3 text-sm text-gray-700 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 rounded-xl border border-gray-200 hover:border-blue-200 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 mt-1">
                <Bot className="h-4 w-4 text-blue-600" />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-md"
                  : "bg-gray-50 text-gray-800 border border-gray-100 rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" ? (
                <>
                  <div
                    className="prose prose-sm max-w-none [&_li]:my-0.5 [&_code]:text-blue-700"
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                  />
                  {msg.provider && <ProviderBadge provider={msg.provider} />}
                </>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
              <p
                className={`text-[10px] mt-2 ${
                  msg.role === "user" ? "text-blue-200" : "text-gray-400"
                }`}
              >
                {msg.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {msg.role === "user" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 mt-1">
                <User className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 mt-1">
              <Bot className="h-4 w-4 text-blue-600" />
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  Thinking with{" "}
                  <span className="font-medium">{activeProvider.label}</span>…
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50">
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about inventory, requirements, POs, deliveries..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-[10px] text-gray-400 text-center">
          SMLS AI has read-only access. It cannot create, edit, or delete any records.
        </p>
      </div>
    </div>
  );
}
