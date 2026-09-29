import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPostById } from "@/lib/posts";
import PostEditor from "@/components/PostEditor";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: Props) {
  const session = await getSession();
  if (session !== "true") redirect("/login");

  const { id } = await params;
  const postId = parseInt(id, 10);
  if (Number.isNaN(postId)) redirect("/");

  const post = await getPostById(postId);
  if (!post) redirect("/");

  return (
    <PostEditor
      mode="edit"
      postId={post.id}
      initialTitle={post.title}
      initialContent={post.content}
      initialImage={post.image ?? null}
      initialVideo={
        post.video
          ? {
              id: post.video.id,
              url: post.video.url ?? null,
              status: post.video.status ?? "queued",
            }
          : null
      }
      backHref={`/post/${post.id}`}
    />
  );
}
