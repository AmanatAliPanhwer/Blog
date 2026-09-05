import type { Metadata } from "next";
import { getPostById } from "@/lib/posts";
import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";
import PostViewClient from "./PostViewClient";

interface Props {
  params: Promise<{ id: string }>;
}

function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, " ")
    .trim()
    .slice(0, 200);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const postId = parseInt(id, 10);
  const post = Number.isNaN(postId) ? null : await getPostById(postId);
  if (!post) return { title: "Not found" };

  const description = plainText(post.content_safe || post.content) || undefined;
  const ogTitle = post.title || `Note #${post.id}`;

  return {
    title: ogTitle,
    description,
    openGraph: {
      type: "article",
      title: ogTitle,
      description,
      images: post.image ? [{ url: post.image }] : undefined,
    },
  };
}

export default async function PostViewPage({ params }: Props) {
  const { id } = await params;
  const postId = parseInt(id, 10);
  if (Number.isNaN(postId)) notFound();

  const post = await getPostById(postId);
  if (!post) notFound();

  const session = await getSession();
  return <PostViewClient post={post} isAdmin={session === "true"} />;
}