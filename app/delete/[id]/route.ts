import { NextRequest, NextResponse } from "next/server";
import { deletePost } from "@/lib/posts";
import { getSession } from "@/lib/auth";

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Props) {
  const session = await getSession();
  if (session !== "true") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { id } = await params;
  const postId = parseInt(id, 10);
  if (isNaN(postId)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  try {
    await deletePost(postId);
    const dest = new URL("/", req.url);
    dest.searchParams.set("flash", `Post ${postId} deleted successfully!`);
    return NextResponse.redirect(dest);
  } catch (e) {
    console.error("Error deleting post:", e);
    const dest = new URL("/", req.url);
    dest.searchParams.set("flash", "Failed to delete post");
    return NextResponse.redirect(dest);
  }
}
