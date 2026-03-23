"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageSquare,
  X,
  Minus,
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  Trash2,
  ChevronDown,
} from "lucide-react";

type AIProvider = "gemini" | "groq" | "mistral" | "nvidia";
type ChatState = "closed" | "minimized" | "open";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  provider?: AIProvider;
}

interface ProviderOption {
  id: AIProvider;
  label: string;
  dot: string;
}

const PROVIDERS: ProviderOption[] = [
  { id: "groq", label: "Groq · Llama 3.3", dot: "bg-purple-500" },
  { id: "nvidia", label: "Nvidia · Llama 3.1 405B", dot: "bg-green-500" },
  { id: "gemini", label: "Gemini 2.0 Flash", dot: "bg-blue-500" },
  { id: "mistral", label: "Mistral Large", dot: "bg-orange-500" },
];

function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/^### (.*$)/gm, '<h3 class="font-semibold text-sm mt-2 mb-1">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="font-semibold text-base mt-2 mb-1">$1</h2>')
    .replace(/^- (.*$)/gm, '<li class="ml-3 list-disc text-xs">$1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-3 list-decimal text-xs">$2</li>')
    .replace(/\n/g, "<br />");
}

export function FloatingChatbot({ userName }: { userName?: string }) {
  const [chatState, setChatState] = useState<ChatState>("closed");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("groq");
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change and chat is open
  useEffect(() => {
    if (chatState === "open") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatState]);

  // Focus input when opened
  useEffect(() => {
    if (chatState === "open") {
      setTimeout(() => inputRef.current?.focus(), 50);
      setUnreadCount(0);
    }
  }, [chatState]);

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

  const handleOpen = useCallback(() => {
    setChatState("open");
    setUnreadCount(0);
  }, []);

  const handleMinimize = useCallback(() => setChatState("minimized"), []);

  // Close wipes all chat data
  const handleClose = useCallback(() => {
    setChatState("closed");
    setMessages([]);
    setInput("");
    setUnreadCount(0);
  }, []);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          provider: selectedProvider,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get response");

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        provider: selectedProvider,
      };
      setMessages((prev) => [...prev, aiMsg]);

      // If minimized, show unread badge
      if (chatState === "minimized") setUnreadCount((n) => n + 1);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `❌ ${err.message}. Please try again.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      if (chatState === "open") inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const activeProvider = PROVIDERS.find((p) => p.id === selectedProvider)!;

  // ── Closed: just a floating button ──────────────────────────────────────────
  if (chatState === "closed") {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all hover:scale-105 active:scale-95"
        aria-label="Open SMLS AI Assistant"
      >
        <MessageSquare className="h-6 w-6" />
      </button>
    );
  }

  // ── Minimized: pill button ───────────────────────────────────────────────────
  if (chatState === "minimized") {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-white shadow-lg hover:bg-blue-700 transition-all hover:scale-105"
        aria-label="Restore SMLS AI Assistant"
      >
        <Sparkles className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">SMLS AI</span>
        {unreadCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold">
            {unreadCount}
          </span>
        )}
      </button>
    );
  }

  // ── Open: full chat panel ────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[380px] h-[560px] bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">SMLS AI Assistant</p>
            <p className="text-[10px] text-blue-100 leading-tight">Read-only · Internet enabled</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Provider selector */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setProviderMenuOpen((o) => !o)}
              className="flex items-center gap-1 rounded-lg bg-white/15 hover:bg-white/25 px-2 py-1 text-[10px] font-medium transition-colors"
              title="Switch AI model"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeProvider.dot}`} />
              {activeProvider.label.split("·")[0].trim()}
              <ChevronDown className="h-2.5 w-2.5 opacity-70" />
            </button>
            {providerMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                <p className="px-3 py-1.5 text-[9px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  AI Model
                </p>
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProvider(p.id);
                      setProviderMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                      selectedProvider === p.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.dot}`} />
                    <span className="text-xs text-gray-700">{p.label}</span>
                    {selectedProvider === p.id && (
                      <span className="ml-auto text-blue-600 text-xs">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Minimize */}
          <button
            onClick={handleMinimize}
            className="rounded-md p-1 hover:bg-white/20 transition-colors"
            title="Minimise"
            aria-label="Minimise chat"
          >
            <Minus className="h-4 w-4" />
          </button>

          {/* Close (clears history) */}
          <button
            onClick={handleClose}
            className="rounded-md p-1 hover:bg-white/20 transition-colors"
            title="Close & clear chat"
            aria-label="Close and clear chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/30">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 mb-3">
              <Bot className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-gray-800 mb-1">
              Hi{userName ? `, ${userName.split(" ")[0]}` : ""}! How can I help?
            </p>
            <p className="text-xs text-gray-400 max-w-[260px] mb-4">
              Ask me anything about inventory, requirements, POs, deliveries, QC and more.
            </p>
            <div className="grid grid-cols-1 gap-1.5 w-full">
              {[
                "What's the current inventory status?",
                "Show pending requirements",
                "Which vendors are approved?",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setInput(s);
                    inputRef.current?.focus();
                  }}
                  className="text-left px-3 py-2 text-xs text-gray-600 bg-white hover:bg-blue-50 hover:text-blue-700 rounded-xl border border-gray-200 hover:border-blue-200 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-100 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-blue-600" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm"
              }`}
            >
              {msg.role === "assistant" ? (
                <div
                  className="prose prose-xs max-w-none"
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                />
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
              <p className={`text-[9px] mt-1 ${msg.role === "user" ? "text-blue-200" : "text-gray-300"}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            {msg.role === "user" && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-600 mt-0.5">
                <User className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-100">
              <Bot className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Thinking…
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 px-3 py-2.5 bg-white">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about inventory, POs, QC…"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        {messages.length > 0 && (
          <div className="flex justify-between items-center mt-1.5">
            <p className="text-[9px] text-gray-300">Read-only · cannot modify records</p>
            <button
              onClick={() => setMessages([])}
              className="flex items-center gap-1 text-[9px] text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-2.5 w-2.5" />
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
