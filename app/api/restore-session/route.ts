import { NextRequest, NextResponse } from "next/server";
import { restorePersistentSession } from "@/lib/auth";

// Route Handlers are a write-safe context for cookies, so persistent-login
// restoration happens here instead of inside Server Component rendering.
export async function POST(req: NextRequest) {
  const restored = await restorePersistentSession(req);
  return NextResponse.json({ ok: restored });
}