import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { SESSION_COOKIE } from "@/lib/auth";

function secretSource(): string {
  if (process.env.AUTH_SECRET) return "AUTH_SECRET";
  if (process.env.ADMIN_PASSWORD) return "ADMIN_PASSWORD";
  return "NONE";
}

function describeToken(token: string | undefined): string {
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

export async function GET(req: NextRequest) {
  const xfp = req.headers.get("x-forwarded-proto");
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  return NextResponse.json({
    cookie: { name: SESSION_COOKIE, status: describeToken(token) },
    secret: {
      source: secretSource(),
      configured: Boolean(process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD),
    },
    transport: {
      protocol: req.nextUrl.protocol,
      xForwardedProto: xfp,
    },
    host: {
      nextUrlHost: req.nextUrl.host,
      xForwardedHost: req.headers.get("x-forwarded-host"),
    },
    env: process.env.NODE_ENV,
  });
}