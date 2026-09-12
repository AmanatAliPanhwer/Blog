"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Post } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SupabaseImage from "@/components/SupabaseImage";
import VideoThumb from "@/components/VideoThumb";
import { markFeedOrigin } from "@/components/HistoryNavFlag";

interface PostCardProps {
  post: Post;
  isAdmin: boolean;
}

export default function PostCard({ post, isAdmin }: PostCardProps) {
  const router = useRouter();

  const handleDelete = () => {
    if (confirm("Delete this note? This cannot be undone.")) {
      router.push(`/delete/${post.id}`);
    }
  };

  return (
    <Card className="overflow-hidden rounded-[10px] border-b border-[#fffaff] bg-card shadow-[0_4px_6px_rgba(0,255,0,0.3)]">
      <Link
        href={`/post/${post.id}`}
        onClick={() => markFeedOrigin(post.id)}
        className="group block p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {post.title ? (
          <h2 className="font-heading text-3xl font-bold text-primary">
            {post.title}
          </h2>
        ) : null}

        <div
          className="post-markup post-markup--clamp mt-1"
          dangerouslySetInnerHTML={{ __html: post.content_safe || post.content }}
        />

        {post.image ? (
          <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-lg border border-border">
            <SupabaseImage
              src={post.image}
              alt=""
              sizes="(max-width: 768px) 100vw, 768px"
              className="transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </div>
        ) : null}

        {post.video ? <VideoThumb video={post.video} className="mt-3" /> : null}

        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3" />
          {post.formatted_timestamp || "—"}
        </p>
      </Link>

      {isAdmin ? (
        <div className="flex items-center justify-between border-t border-border/60 px-3 py-1.5">
          <span className="px-1 text-xs text-muted-foreground">#{post.id}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${post.title || "post"}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/edit/${post.id}`}>
                  <Pencil />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={handleDelete}
                className="cursor-pointer"
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
    </Card>
  );
}