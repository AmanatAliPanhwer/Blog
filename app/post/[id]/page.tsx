import { getPostById } from "@/lib/posts";
import { notFound } from "next/navigation";
import PostViewClient from "./PostViewClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PostViewPage({ params }: Props) {
  const { id } = await params;
  const postId = parseInt(id, 10);
  if (isNaN(postId)) notFound();

  const post = await getPostById(postId);
  if (!post) notFound();

  return <PostViewClient post={post} />;
}
