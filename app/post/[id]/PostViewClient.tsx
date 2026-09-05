"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft, Clock, Pencil, Trash2 } from "lucide-react";
import type { Post } from "@/types";
import { Button } from "@/components/ui/button";
import ImageLightbox from "@/components/ImageLightbox";

const VideoPlayer = dynamic(() => import("@/components/VideoPlayer"), {
  ssr: false,
});

export default function PostViewClient({
  post,
  isAdmin,
}: {
  post: Post;
  isAdmin: boolean;
}) {
  const router = useRouter();

  const handleDelete = () => {
    if (confirm("Delete this note? This cannot be undone.")) {
      router.push(`/delete/${post.id}`);
    }
  };

  return (
    <div className="space-y-5">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 font-sans text-sm text-primary transition-colors hover:underline"
      >
        <ArrowLeft className="size-4" />
        Back to Home
      </Link>

      <article className="space-y-4 rounded-[10px] border border-[#fffaff]/30 bg-card p-4 shadow-[0_4px_8px_rgba(0,255,0,0.4)] sm:p-6">
        {post.title ? (
          <h1 className="font-heading text-4xl font-bold tracking-tight text-primary">
            {post.title}
          </h1>
        ) : null}

        <p className="flex items-center gap-1.5 font-sans text-sm text-muted-foreground">
          <Clock className="size-4" />
          <strong className="text-foreground">Published:</strong>{" "}
          {post.formatted_timestamp || "—"}
        </p>

        <div
          className="post-markup"
          dangerouslySetInnerHTML={{ __html: post.content_safe || post.content }}
        />

        {post.image ? (
          <ImageLightbox src={post.image} alt={post.title || "Post image"} />
        ) : null}

        {post.video ? <VideoPlayer video={post.video} /> : null}
      </article>

      {isAdmin ? (
        <div className="flex items-center gap-2 border-t border-border/60 pt-4">
          <Button asChild variant="outline" size="sm">
            <Link href={`/edit/${post.id}`}>
              <Pencil />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 />
            Delete
          </Button>
        </div>
      ) : null}
    </div>
  );
}