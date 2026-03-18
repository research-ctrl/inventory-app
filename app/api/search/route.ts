import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  // TODO: Full-text search via Supabase
  return NextResponse.json({ query: q, results: [] });
}
