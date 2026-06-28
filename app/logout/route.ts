import { NextResponse } from "next/server";
import { clearSession, clearRememberMeCookie } from "@/lib/auth";

export async function GET() {
  await clearRememberMeCookie();
  await clearSession();
  const res = NextResponse.redirect(new URL("/", process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"));
  res.cookies.delete("admin_session");
  res.cookies.delete("remember_me");
  return res;
}
