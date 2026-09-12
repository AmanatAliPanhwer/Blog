import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { getSupabaseClient } from "./supabase";
import crypto from "crypto";

const COOKIE_NAME = "admin_session";
const REMEMBER_COOKIE = "remember_me";

// The Secure flag must follow the actual request transport, not NODE_ENV:
// over plain HTTP (next start on localhost, or an http host) browsers drop
// Secure cookies, which silently logs the Admin back out on the next request.
export function isSecureRequest(req?: NextRequest): boolean {
  if (!req) return process.env.NODE_ENV === "production";
  const proto =
    req.headers.get("x-forwarded-proto") || req.nextUrl.protocol;
  return proto.split(",")[0].trim().includes("https");
}

export function getAdminCredentials() {
  return {
    username: process.env.ADMIN_USERNAME || "",
    password: process.env.ADMIN_PASSWORD || "",
  };
}

export function isAdminSession(sessionCookie?: string): boolean {
  return sessionCookie === "true";
}

export async function getSession(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (session) return session;

  return (await hasValidRememberToken()) ? "true" : undefined;
}

// Read-only: never mutates cookies, so it is safe to call during Server
// Component rendering (getSession is used by layout.tsx and the pages).
async function hasValidRememberToken(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(REMEMBER_COOKIE)?.value;
  if (!token) return false;

  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  try {
    const { data } = await getSupabaseClient()
      .from("persistent_logins")
      .select("*")
      .eq("token", hashedToken)
      .single();

    if (data) {
      const expiresAt = new Date(data.expires_at);
      if (expiresAt > new Date()) return true;
      await getSupabaseClient()
        .from("persistent_logins")
        .delete()
        .eq("token", hashedToken);
    }
  } catch (e) {
    console.error("Error checking persistent login:", e);
  }

  return false;
}

// Write-safe persistent-login restoration. Next.js only allows cookie writes
// from Server Actions and Route Handlers, so this is called exclusively from
// the /api/restore-session route handler — never from getSession.
export async function restorePersistentSession(
  req?: NextRequest,
): Promise<boolean> {
  const cookieStore = await cookies();
  if (cookieStore.get(COOKIE_NAME)?.value) return true;

  const restored = await hasValidRememberToken();
  if (restored) {
    await setAdminSession(req);
    return true;
  }

  cookieStore.delete(REMEMBER_COOKIE);
  return false;
}

export async function setAdminSession(req?: NextRequest): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "true", {
    httpOnly: true,
    secure: isSecureRequest(req),
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function setRememberMeCookie(req?: NextRequest): Promise<string> {
  const token = crypto.randomUUID();
  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await getSupabaseClient().from("persistent_logins").insert({
    user_id: "admin",
    token: hashedToken,
    expires_at: expiresAt.toISOString(),
  });

  const cookieStore = await cookies();
  cookieStore.set(REMEMBER_COOKIE, token, {
    httpOnly: true,
    secure: isSecureRequest(req),
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });

  return token;
}

export async function clearRememberMeCookie(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(REMEMBER_COOKIE)?.value;
  if (token) {
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
    try {
      await getSupabaseClient()
        .from("persistent_logins")
        .delete()
        .eq("token", hashedToken);
    } catch (e) {
      console.error("Error deleting persistent login token:", e);
    }
  }
  cookieStore.delete(REMEMBER_COOKIE);
}
