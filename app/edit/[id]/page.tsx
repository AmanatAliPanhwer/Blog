import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPostById } from "@/lib/posts";
import EditPostClient from "./EditPostClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: Props) {
  const session = await getSession();
  if (session !== "true") redirect("/login");

  const { id } = await params;
  const postId = parseInt(id, 10);
  if (isNaN(postId)) redirect("/");

  const post = await getPostById(postId);
  if (!post) redirect("/");

  return <EditPostClient post={post} />;
}
