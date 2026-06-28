import { NextRequest, NextResponse } from "next/server";
import { getAdminCredentials, setAdminSession, setRememberMeCookie } from "@/lib/auth";
export async function POST(req: NextRequest) {
  const { username, password, remember } = await req.json();
  const creds = getAdminCredentials();

  if (username !== creds.username || password !== creds.password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await setAdminSession();

  if (remember) {
    await setRememberMeCookie();
  }

  return NextResponse.json({ ok: true });
}
