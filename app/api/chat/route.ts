import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { routeToProvider, type AIProvider } from "@/lib/ai/provider-router";
import { applyGuardrails } from "@/lib/ai/guardrails";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { getDatabaseContext } from "@/lib/ai/database-context";

const VALID_PROVIDERS: AIProvider[] = ["gemini", "grok", "mistral"];

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message, history = [], provider } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (message.length > 4000) {
      return NextResponse.json(
        { error: "Message too long (max 4000 chars)" },
        { status: 400 }
      );
    }

    // Validate provider (fall back to default if invalid/missing)
    const activeProvider: AIProvider =
      provider && VALID_PROVIDERS.includes(provider) ? provider : undefined;

    // Guardrails check
    const guard = applyGuardrails(message);
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason }, { status: 403 });
    }

    // Fetch read-only database context
    const dbContext = await getDatabaseContext();

    // Build messages array — system prompt + DB snapshot + history + current message
    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT + "\n\n" + dbContext },
      ...history.map((h: any) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user" as const, content: message },
    ];

    // Route to selected provider
    const response = await routeToProvider({ messages }, activeProvider);

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error("❌ Chat API error:", error?.message ?? error);
    return NextResponse.json(
      { error: error?.message ?? "An error occurred" },
      { status: 500 }
    );
  }
}
