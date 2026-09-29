import { NextRequest, NextResponse } from "next/server";
import { createPost, updatePost } from "@/lib/posts";
import { sanitizePostHtml } from "@/lib/sanitize";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, content, imageUrl, videoId } = await req.json();

  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  try {
    // Sanitize on write so the stored body is already clean HTML.
    await createPost(
      title || "",
      sanitizePostHtml(content),
      imageUrl || null,
      videoId || null
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (session !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const postId = parseInt(searchParams.get("id") || "", 10);
  if (isNaN(postId)) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
  }

  const { title, content, imageUrl, videoId } = await req.json();

  try {
    await updatePost(
      postId,
      title || "",
      sanitizePostHtml(content || ""),
      imageUrl || null,
      videoId || null
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
