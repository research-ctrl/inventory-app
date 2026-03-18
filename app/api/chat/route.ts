import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // TODO: Route to AI provider via lib/ai
    return NextResponse.json({ message: "Chat endpoint placeholder", input: body });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
