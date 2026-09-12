import { NextRequest, NextResponse } from "next/server";
import { clearRememberMeCookie, isSecureRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await clearRememberMeCookie();
  const res = NextResponse.redirect(req.nextUrl.origin + "/");
  const secure = isSecureRequest(req);
  // Delete on name/domain/path with the same attributes the cookie was stored
  // with, so the removal is honored on the same transport.
  res.cookies.set("admin_session", "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  res.cookies.set("remember_me", "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}