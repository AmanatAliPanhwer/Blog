import crypto from "crypto";
import { SESSION_COOKIE } from "@/lib/auth";

export function describeSessionToken(token: string | undefined): string {
  if (!token) return "absent";
  const dot = token.indexOf(".");
  if (dot <= 0) return "malformed";
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || !signature) return "malformed";
  if (expiresAt <= Date.now()) return "expired";
  const secret = process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || "";
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return "invalid-signature";
  return crypto.timingSafeEqual(a, b) ? "valid" : "invalid-signature";
}

export function cookieDiag(cookieHeader: string | null) {
  const raw = cookieHeader || "";
  const parts = raw
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean);
  const names = parts.map((c) => c.split("=")[0]);
  const session = parts
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.split("=")[1];
  const dot = session ? session.indexOf(".") : -1;
  const exp = dot > 0 && session ? Number(session.slice(0, dot)) : null;
  return {
    raw: raw.slice(0, 500),
    names,
    adminSession: {
      present: Boolean(session),
      status: describeSessionToken(session),
      expiresAtMs: exp,
      minutesToExpiry:
        exp && Number.isFinite(exp) ? Math.round((exp - Date.now()) / 60000) : null,
    },
  };
}

export async function requestDiag() {
  const { headers } = await import("next/headers");
  const h = await headers();
  return {
    transport: {
      proto: h.get("x-forwarded-proto"),
      host: h.get("host"),
      xForwardedHost: h.get("x-forwarded-host"),
    },
    fetch: {
      rsc: h.get("rsc"),
      purpose: h.get("purpose"),
      accept: h.get("accept"),
      priority: h.get("priority"),
      secFetchSite: h.get("sec-fetch-site"),
      secFetchMode: h.get("sec-fetch-mode"),
      secFetchDest: h.get("sec-fetch-dest"),
      secChUa: h.get("sec-ch-ua"),
      referer: h.get("referer"),
    },
    cookies: cookieDiag(h.get("cookie")),
    secret: {
      configured: Boolean(process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD),
      source: process.env.AUTH_SECRET ? "AUTH_SECRET" : "ADMIN_PASSWORD",
    },
  };
}

export function DiagPanel({ diag }: { diag: unknown }) {
  return (
    <details
      style={{
        marginTop: 24,
        fontFamily: "monospace",
        whiteSpace: "pre-wrap",
        fontSize: 11,
        color: "#888",
      }}
    >
      <summary>request diagnostic</summary>
      {JSON.stringify(diag, null, 2)}
    </details>
  );
}