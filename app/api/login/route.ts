import { NextRequest, NextResponse } from "next/server";
import { adminSessionCookie, getAdminCredentials } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  const creds = getAdminCredentials();

  if (username !== creds.username || password !== creds.password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const cookie = adminSessionCookie(req);
  const res = NextResponse.json({
    ok: true,
    debug: {
      cookie: {
        name: cookie.name,
        path: cookie.path,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        maxAgeSeconds: cookie.maxAge,
        expiresAtMs: Date.now() + cookie.maxAge * 1000,
      },
    },
  });
  res.cookies.set(cookie);
  return res;
}