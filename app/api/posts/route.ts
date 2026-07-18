import { NextRequest, NextResponse } from "next/server";
import { getPosts, createPost, updatePost } from "@/lib/posts";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  try {
    const result = await getPosts(page);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch posts", details: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, content, imageUrl, videoId } = await req.json();

  if (!title || !content) {
    return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
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

  const { title, content, imageUrl, videoId } = await req.json();

  try {
    await updatePost(postId, title || "", content || "", imageUrl || null, videoId || null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
