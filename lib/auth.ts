import { cookies } from "next/headers";
import { getSupabaseClient } from "./supabase";
import crypto from "crypto";

const COOKIE_NAME = "admin_session";
const REMEMBER_COOKIE = "remember_me";

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
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function setAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  cookieStore.delete(REMEMBER_COOKIE);
}

export async function checkPersistentLogin(): Promise<boolean> {
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
      if (expiresAt > new Date()) {
        await setAdminSession();
        return true;
      }
      await getSupabaseClient()
        .from("persistent_logins")
        .delete()
        .eq("token", hashedToken);
    }
  } catch (e) {
    console.error("Error checking persistent login:", e);
  }

  cookieStore.delete(REMEMBER_COOKIE);
  return false;
}

export async function setRememberMeCookie(): Promise<string> {
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
    secure: process.env.NODE_ENV === "production",
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
