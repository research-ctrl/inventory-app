import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pinId = searchParams.get("pinId");
  if (!pinId) {
    return NextResponse.json({ error: "pinId required" }, { status: 400 });
  }
  // TODO: Trace full material genealogy
  return NextResponse.json({ pinId, genealogy: [] });
}
