import crypto from "crypto";
import { getSupabaseClient, TIMESTAMP_FIELD, POSTS_PER_PAGE, BLOG_IMAGES_BUCKET, BLOG_VIDEOS_BUCKET } from "./supabase";
import { Post, PostRaw, FilterParams } from "@/types";
import { cache } from "react";
import { sanitizePostHtml } from "./sanitize";

export { sanitizePostHtml };

const SELECT_FIELDS = `id, title, content, image, ${TIMESTAMP_FIELD}, video_id`;

function formatTimestamp(ts: string | null | undefined): string {
  if (!ts) return "";
  try {
    const dt = new Date(ts);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    const hours = dt.getHours();
    const minutes = String(dt.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    return `${year}-${month}-${day} ${h12}:${minutes} ${ampm}`;
  } catch {
    return String(ts);
  }
}

function getLocalTimestamp(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 19).replace("T", " ");
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
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      content_safe: sanitizePostHtml(post.content),
      image: post.image,
      video_id: videoId,
      timestamp: ts ?? undefined,
      formatted_timestamp: formatTimestamp(ts),
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
  if (year && year !== "any") {
    query = query
      .gte(TIMESTAMP_FIELD, `${year}-01-01T00:00:00Z`)
      .lt(TIMESTAMP_FIELD, `${Number(year) + 1}-01-01T00:00:00Z`);
  }
  if (month && month !== "any") {
    const cy = year && year !== "any" ? year : String(new Date().getFullYear());
    const nm = Number(month) + 1;
    const ny = nm > 12 ? Number(cy) + 1 : Number(cy);
    const fm = nm > 12 ? "01" : String(nm).padStart(2, "0");
    query = query
      .gte(TIMESTAMP_FIELD, `${cy}-${month.padStart(2, "0")}-01T00:00:00Z`)
      .lt(TIMESTAMP_FIELD, `${ny}-${fm}-01T00:00:00Z`);
  }
  if (day && day !== "any") {
    const cy = year && year !== "any" ? year : String(new Date().getFullYear());
    const cm = month && month !== "any" ? month : String(new Date().getMonth() + 1);
    const nd = Number(day) + 1;
    let ndMonth = Number(cm);
    let ndYear = Number(cy);
    if (nd > 28) {
      try {
        new Date(Number(cy), Number(cm) - 1, nd);
      } catch {
        ndMonth++;
        if (ndMonth > 12) { ndMonth = 1; ndYear++; }
      }
    }
    query = query
      .gte(TIMESTAMP_FIELD, `${cy}-${cm.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00Z`)
      .lt(TIMESTAMP_FIELD, `${ndYear}-${String(ndMonth).padStart(2, "0")}-${String(nd).padStart(2, "0")}T00:00:00Z`);
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

  const years = Array.from(new Set(vals.map((v) => new Date(v).getFullYear().toString()))).sort((a, b) => Number(b) - Number(a));
  const months = Array.from(new Set(vals.map((v) => String(new Date(v).getMonth() + 1).padStart(2, "0")))).sort();
  const days = Array.from(new Set(vals.map((v) => String(new Date(v).getDate()).padStart(2, "0")))).sort();

  return { years, months, days };
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
        timestamp: getLocalTimestamp(),
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