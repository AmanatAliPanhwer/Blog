import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export const BLOG_IMAGES_BUCKET =
  process.env.BLOG_IMAGES_BUCKET || "blog_images";
export const BLOG_VIDEOS_BUCKET =
  process.env.BLOG_VIDEOS_BUCKET || "blog_videos";
export const POSTS_PER_PAGE = 10;
export const TIMESTAMP_FIELD = "timestamp";

function getSupabaseUrl(): string {
  return process.env.SUPABASE_URL || "";
}

function getSupabaseKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ""
  );
}

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  if (!url || !url.startsWith("http")) {
    throw new Error(
      "Supabase not configured.\n" +
      "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in .env.local\n" +
      "See .env.local for all required vars."
    );
  }
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  return !!(url && url.startsWith("http"));
}
