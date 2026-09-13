import { headers } from "next/headers";
import crypto from "crypto";
import PostEditor from "@/components/PostEditor";
import { SESSION_COOKIE } from "@/lib/auth";
import { getSession } from "@/lib/auth";

function describe(token: string | undefined): string {
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

export default async function NewPostPage() {
  const session = await getSession();
  if (session === "true") {
    return <PostEditor mode="new" backHref="/" />;
  }

  const h = await headers();
  const cookieHeader = h.get("cookie") || "";
  const cookieNames = cookieHeader
    .split(";")
    .map((c) => c.trim().split("=")[0])
    .filter(Boolean);
  const rawSession = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.split("=")[1];

  const now = Date.now();
  const dot = rawSession ? rawSession.indexOf(".") : -1;
  const exp =
    dot > 0 && rawSession ? Number(rawSession.slice(0, dot)) : null;

  const diag = {
    request: {
      method: "GET",
      pathname: "/new",
      rsc: h.get("rsc"),
      referer: h.get("referer"),
      userAgent: h.get("user-agent"),
      nextUrlHost: h.get("host"),
      xForwardedHost: h.get("x-forwarded-host"),
      xForwardedProto: h.get("x-forwarded-proto"),
      isSecure: (h.get("x-forwarded-proto") || "").includes("https"),
    },
    cookies: {
      names: cookieNames,
      adminSession: {
        present: Boolean(rawSession),
        status: describe(rawSession),
        expiresAtMs: exp,
        nowMs: now,
        minutesToExpiry: exp ? Math.round((exp - now) / 60000) : null,
      },
    },
    secret: {
      configured: Boolean(process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD),
      source: process.env.AUTH_SECRET ? "AUTH_SECRET" : "ADMIN_PASSWORD",
    },
  };

  return (
    <div style={{ fontFamily: "monospace", whiteSpace: "pre-wrap", padding: 16 }}>
      <h2>server session diagnostic (would normally redirect to /login)</h2>
      {JSON.stringify(diag, null, 2)}
    </div>
  );
}