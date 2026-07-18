import { NextRequest, NextResponse } from "next/server";
import { getPosts, createPost, updatePost, uploadImage, saveVideo, deletePost } from "@/lib/posts";
import { getSession } from "@/lib/auth";

interface PostBody {
  title: string;
  content: string;
  imageFile: File | null;
  videoFile: File | null;
}

async function parsePostBody(req: NextRequest): Promise<PostBody> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    return {
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      imageFile: formData.get("image") as File | null,
      videoFile: formData.get("video") as File | null,
    };
  }

  const body = await req.json();
  return {
    title: body.title,
    content: body.content,
    imageFile: null,
    videoFile: null,
  };
}

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

  const { title, content, imageFile, videoFile } = await parsePostBody(req);

  if (!title || !content) {
    return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
  }

  let imageUrl: string | null = null;
  if (imageFile && imageFile.size > 0) {
    imageUrl = await uploadImage(imageFile);
  }

  let videoId: number | null = null;
  if (videoFile && videoFile.size > 0) {
    const result = await saveVideo(videoFile);
    if (result) videoId = result.file_id;
  }

  try {
    await createPost(title, content, imageUrl, videoId);
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

  const { title, content, imageFile, videoFile } = await parsePostBody(req);

  let imageUrl: string | null = null;
  if (imageFile && imageFile.size > 0) {
    imageUrl = await uploadImage(imageFile);
  }

  let videoId: number | null = null;
  if (videoFile && videoFile.size > 0) {
    const result = await saveVideo(videoFile);
    if (result) videoId = result.file_id;
  }

  try {
    await updatePost(postId, title, content, imageUrl, videoId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
