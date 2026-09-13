import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

export async function GET() {
  const res = NextResponse.redirect(
    new URL("/", process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
  res.cookies.delete(SESSION_COOKIE);
  return res;
}