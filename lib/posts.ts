import crypto from "crypto";
import { getSupabaseClient, TIMESTAMP_FIELD, POSTS_PER_PAGE, BLOG_IMAGES_BUCKET, BLOG_VIDEOS_BUCKET } from "./supabase";
import { Post, PostRaw, FilterParams } from "@/types";
import { cache } from "react";
import { sanitizePostHtml } from "./sanitize";
import {
  formatBlogTimestamp,
  nowUtcIso,
  parseStoredTimestamp,
  zonedCivilRangeUtc,
  zonedYearMonthDay,
} from "./date";

export { sanitizePostHtml };

const SELECT_FIELDS = `id, title, content, image, ${TIMESTAMP_FIELD}, video_id`;

/** Server/SSR fallback rendering of a stored value in BLOG_TIMEZONE. */
function formatTimestamp(ts: string | null | undefined): string {
  const dt = parseStoredTimestamp(ts);
  return dt ? formatBlogTimestamp(dt) : "";
}

interface VideoInfo {
  id: number;
  filename?: string;
  filepath?: string;
  status?: string;
  url?: string;
}

async function fetchVideosByIds(ids: number[]): Promise<Map<number, VideoInfo>> {
  const map = new Map<number, VideoInfo>();
  if (ids.length === 0) return map;
  try {
    const { data } = await getSupabaseClient()
      .from("videos")
      .select("id, filepath, filename, status")
      .in("id", ids);
    for (const v of data || []) {
      map.set(v.id, {
        id: v.id,
        filename: v.filename,
        filepath: v.filepath,
        status: v.status,
        url: v.filepath,
      });
    }
  } catch (e) {
    console.error("Error fetching video info:", e);
  }
  return map;
}

async function enrichPosts(rawPosts: PostRaw[]): Promise<Post[]> {
  if (rawPosts.length === 0) return [];
  const videoIds = [
    ...new Set(
      rawPosts
        .map((p) => p.video_id as number | null)
        .filter((id): id is number => !!id && !Number.isNaN(id))
    ),
  ];
  const videos = await fetchVideosByIds(videoIds);

  return rawPosts.map((post) => {
    const ts = post[TIMESTAMP_FIELD] as string | null;
    const videoId = post.video_id as number | null;
    const dt = parseStoredTimestamp(ts);
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      content_safe: sanitizePostHtml(post.content),
      image: post.image,
      video_id: videoId,
      timestamp: dt ? dt.toISOString() : undefined,
      formatted_timestamp: dt ? formatBlogTimestamp(dt) : "",
      video: videoId ? videos.get(videoId) || null : null,
    };
  });
}

async function enrichPost(post: PostRaw): Promise<Post> {
  const [enriched] = await enrichPosts([post]);
  return enriched;
}

export interface FeedQuery {
  page?: number;
  q?: string;
  year?: string | null;
  month?: string | null;
  day?: string | null;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

function applyFilters(
  query: /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ any,
  params: FilterParams & { q?: string }
): typeof query {
  const { year, month, day, q } = params;
  if (q && q.trim()) {
    const escaped = escapeLike(q.trim());
    query = query.or(`title.ilike.%${escaped}%,content.ilike.%${escaped}%`);
  }
  // Months/days without an explicit year fall back to the current civil day in
  // BLOG_TIMEZONE, matching how the FilterPanel behaves standalone.
  const today = zonedYearMonthDay(new Date());
  const cy = year && year !== "any" ? Number(year) : today.year;
  const cm = month && month !== "any" ? Number(month) : today.month;
  if (year && year !== "any") {
    const { gte, lt } = zonedCivilRangeUtc(cy);
    query = query.gte(TIMESTAMP_FIELD, gte.toISOString()).lt(TIMESTAMP_FIELD, lt.toISOString());
  }
  if (month && month !== "any") {
    const { gte, lt } = zonedCivilRangeUtc(cy, cm);
    query = query.gte(TIMESTAMP_FIELD, gte.toISOString()).lt(TIMESTAMP_FIELD, lt.toISOString());
  }
  if (day && day !== "any") {
    const nd = day ? Number(day) : today.day;
    const { gte, lt } = zonedCivilRangeUtc(cy, cm, nd);
    query = query.gte(TIMESTAMP_FIELD, gte.toISOString()).lt(TIMESTAMP_FIELD, lt.toISOString());
  }
  return query;
}

/**
 * Unified feed query: pagination + archive filter + search in one call.
 * Only used from server components / route handlers.
 */
export const getFeed = cache(async (params: FeedQuery = {}): Promise<{ posts: Post[]; has_next: boolean }> => {
  const page = Math.max(1, params.page || 1);
  const offset = (page - 1) * POSTS_PER_PAGE;

  const base = getSupabaseClient().from("posts").select(SELECT_FIELDS);
  const filtered = applyFilters(base, {
    q: params.q ?? undefined,
    year: params.year ?? undefined,
    month: params.month ?? undefined,
    day: params.day ?? undefined,
  });

  const { data } = await filtered.order(TIMESTAMP_FIELD, { ascending: false }).range(offset, offset + POSTS_PER_PAGE - 1);
  const { data: nextData } = await getSupabaseClient()
    .from("posts")
    .select("id")
    .order(TIMESTAMP_FIELD, { ascending: false })
    .range(offset + POSTS_PER_PAGE, offset + POSTS_PER_PAGE);

  const posts = await enrichPosts(data || []);
  return { posts, has_next: !!nextData?.length };
});

export const getPosts = cache(async (page: number = 1): Promise<{ posts: Post[]; has_next: boolean }> =>
  getFeed({ page })
);

export const getFilteredPosts = cache(async (params: FilterParams & { q?: string }): Promise<Post[]> => {
  const base = getSupabaseClient().from("posts").select(SELECT_FIELDS);
  const filtered = applyFilters(base, params);
  const { data } = await filtered.order(TIMESTAMP_FIELD, { ascending: false });
  return enrichPosts(data || []);
});

export const getFilterOptions = cache(async (): Promise<{ years: string[]; months: string[]; days: string[] }> => {
  const { data } = await getSupabaseClient()
    .from("posts")
    .select(TIMESTAMP_FIELD)
    .order(TIMESTAMP_FIELD, { ascending: false });

  const vals = (data || [])
    .map((r: Record<string, unknown>) => r[TIMESTAMP_FIELD] as string)
    .filter(Boolean);

  const days = new Set<string>();
  const months = new Set<string>();
  const years = new Set<string>();
  for (const v of vals) {
    const dt = parseStoredTimestamp(v);
    if (!dt) continue;
    const zd = zonedYearMonthDay(dt);
    years.add(String(zd.year));
    months.add(String(zd.month).padStart(2, "0"));
    days.add(String(zd.day).padStart(2, "0"));
  }

  return {
    years: Array.from(years).sort((a, b) => Number(b) - Number(a)),
    months: Array.from(months).sort(),
    days: Array.from(days).sort(),
  };
});

export const getPostById = cache(async (postId: number): Promise<Post | null> => {
  const { data } = await getSupabaseClient()
    .from("posts")
    .select(SELECT_FIELDS)
    .eq("id", postId)
    .single();

  if (!data) return null;
  return enrichPost(data as PostRaw);
});

export async function createPost(title: string, content: string, imageUrl: string | null, videoId: number | null): Promise<void> {
  title = title || "";
  content = content || "";
  let maxAttempts = 5;
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      const { data: maxData } = await getSupabaseClient()
        .from("posts")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);

      const newId = (maxData?.[0]?.id ?? 0) + 1;

      await getSupabaseClient().from("posts").insert({
        id: newId,
        title,
        content,
        image: imageUrl,
        timestamp: nowUtcIso(),
        video_id: videoId,
      });
      return;
    } catch (e: unknown) {
      const errStr = String(e);
      if (errStr.includes("23505") || errStr.toLowerCase().includes("duplicate key")) {
        attempt++;
        continue;
      }
      throw e;
    }
  }
  throw new Error("Failed to insert post after retries");
}

export async function updatePost(postId: number, title: string, content: string, imageUrl: string | null, videoId: number | null): Promise<void> {
  const { error } = await getSupabaseClient()
    .from("posts")
    .update({ title, content, image: imageUrl, video_id: videoId })
    .eq("id", postId);

  if (error) throw error;
}

export async function deletePost(postId: number): Promise<void> {
  const { error } = await getSupabaseClient().from("posts").delete().eq("id", postId);
  if (error) throw error;
}

export async function uploadImage(file: File): Promise<string | null> {
  const filename = `${crypto.randomUUID()}.${file.name.split(".").pop()}`;
  const bytes = await file.arrayBuffer();

  const { error } = await getSupabaseClient().storage
    .from(BLOG_IMAGES_BUCKET)
    .upload(filename, new Uint8Array(bytes), {
      contentType: file.type,
    });

  if (error) {
    if (String(error).includes("409")) {
      const SUPABASE_URL = process.env.SUPABASE_URL || "";
      return `${SUPABASE_URL}/storage/v1/object/public/${BLOG_IMAGES_BUCKET}/${filename}`;
    }
    console.error("Error uploading image:", error);
    return null;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || "";
  return `${SUPABASE_URL}/storage/v1/object/public/${BLOG_IMAGES_BUCKET}/${filename}`;
}

export async function saveVideo(file: File): Promise<{ file_id: number } | null> {
  const filename = `${crypto.randomUUID()}.${file.name.split(".").pop()}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await getSupabaseClient().storage
    .from(BLOG_VIDEOS_BUCKET)
    .upload(`upload/${filename}`, new Uint8Array(bytes), {
      contentType: file.type,
    });

  if (uploadError) {
    console.error("Error uploading video:", uploadError);
    return null;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || "";
  const filepath = `${SUPABASE_URL}/storage/v1/object/public/${BLOG_VIDEOS_BUCKET}/upload/${filename}`;

  const { error: insertError } = await getSupabaseClient().from("videos").insert({
    filename,
    filepath,
    status: "queued",
  });

  if (insertError) {
    console.error("Error inserting video record:", insertError);
    return null;
  }

  const { data } = await getSupabaseClient()
    .from("videos")
    .select("id")
    .eq("filepath", filepath)
    .single();

  if (!data) return null;

  // Queue for processing (fire-and-forget to external ffmpeg service)
  try {
    const origin = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    fetch(`${origin}/api/process-video/${data.id}`, { method: "POST" }).catch(() => {});
  } catch {
    // fire and forget
  }

  return { file_id: data.id };
}