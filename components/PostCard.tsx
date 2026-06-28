"use client";

import { Post } from "@/types";
import dynamic from "next/dynamic";
import ImageLightbox from "./ImageLightbox";
import { stripScripts } from "@/lib/posts";

const VideoPlayer = dynamic(() => import("@/components/VideoPlayer"), { ssr: false });

interface PostCardProps {
  post: Post;
  isAdmin: boolean;
}

export default function PostCard({ post, isAdmin }: PostCardProps) {
  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="post">
      <a href={`/post/${post.id}`} className="post-button">
        <h1 className="Heding">{post.title}</h1>
        <p className="text" dangerouslySetInnerHTML={{ __html: stripScripts(post.content) }} />
        {post.image && (
          <>
            <div onClick={(e) => e.stopPropagation()}>
              <ImageLightbox src={post.image} />
            </div>
            <br />
          </>
        )}
        {post.video && (
          <div onClick={handleVideoClick}>
            <VideoPlayer video={post.video} />
          </div>
        )}
        <small>Posted on {post.formatted_timestamp || ""}</small>
        <br />
      </a>
      {isAdmin && (
        <div style={{ marginTop: 8 }}>
          <a style={{ paddingRight: 5 }} href={`/edit/${post.id}`}>Edit</a>
          <a href={`/delete/${post.id}`}>Delete</a>
        </div>
      )}
    </div>
  );
}
