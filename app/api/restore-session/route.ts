import { NextResponse } from "next/server";
import { restorePersistentSession } from "@/lib/auth";

// Route Handlers are a write-safe context for cookies, so persistent-login
// restoration happens here instead of inside Server Component rendering.
export async function POST() {
  const restored = await restorePersistentSession();
  return NextResponse.json({ ok: restored });
}