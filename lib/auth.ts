import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import crypto from "crypto";

export const SESSION_COOKIE = "admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year — the Admin is always remembered
const SESSION_TTL_MS = SESSION_MAX_AGE * 1000;

export function getAdminCredentials() {
  return {
    username: process.env.ADMIN_USERNAME || "",
    password: process.env.ADMIN_PASSWORD || "",
  };
}

function getAuthSecret(): string {
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || "";
}

// The Secure flag must follow the actual request transport, not NODE_ENV:
// browsers silently drop Secure cookies over plain http, which looks exactly
// like "logged in, then signed out" on the very next request.
function isSecureRequest(req?: NextRequest): boolean {
  if (!req) return process.env.NODE_ENV === "production";
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol;
  return proto.split(",")[0].trim().includes("https");
}

// A self-contained session: `<expiryMilliseconds>.<hmac-signature>`. The value
// is tied to the deployment secret, so it cannot be forged or tampered with.
function buildSessionToken(): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", getAuthSecret())
    .update(payload)
    .digest("base64url");
  return `${expiresAt}.${signature}`;
}

function isSessionTokenValid(token: string | undefined, now = Date.now()): boolean {
  if (!token || !getAuthSecret()) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;

  const expected = crypto
    .createHmac("sha256", getAuthSecret())
    .update(payload)
    .digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Read-only admin check, safe to call while Server Components render. Never
// mutates cookies, so a valid session persists for its full lifetime on its
// own — there is no separate restore step.
export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return isSessionTokenValid(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function getSession(): Promise<string | undefined> {
  return (await isAdmin()) ? "true" : undefined;
}

// The single always-remembered session cookie. Attach it to the login response
// with `res.cookies.set(adminSessionCookie(req))`; delete it on logout.
export function adminSessionCookie(req?: NextRequest) {
  return {
    name: SESSION_COOKIE,
    value: buildSessionToken(),
    httpOnly: true,
    secure: isSecureRequest(req),
    sameSite: "lax" as const,
    maxAge: SESSION_MAX_AGE,
    path: "/",
  };
}