import { NextRequest, NextResponse } from "next/server";
import { createPost, updatePost } from "@/lib/posts";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const session = await getSession();
  if (session !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, content, imageUrl, videoId } = body;

  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  try {
    await createPost(title, content, imageUrl || null, videoId || null);
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

  const body = await req.json();
  const { title, content, imageUrl, videoId } = body;

  try {
    await updatePost(postId, title || "", content || "", imageUrl || null, videoId || null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
