"use client";

import { Post } from "@/types";
import dynamic from "next/dynamic";
import ImageLightbox from "@/components/ImageLightbox";
import { stripScripts } from "@/lib/posts";

const VideoPlayer = dynamic(() => import("@/components/VideoPlayer"), { ssr: false });

export default function PostViewClient({ post }: { post: Post }) {
  return (
    <>
      <link rel="stylesheet" type="text/css" href="/static/css/post.css" />
      <div className="container">
        <h1>{post.title}</h1>
        <p><strong>Published:</strong> {post.formatted_timestamp || ""}</p>
        <p dangerouslySetInnerHTML={{ __html: stripScripts(post.content) }} />
        {post.image && <ImageLightbox src={post.image} />}
        {post.video && <VideoPlayer video={post.video} />}
        <br />
      </div>
      <div className="Back-to-home-container">
        <a href="/" className="Back-to-home">
          <img src="/static/arrow.svg" alt="Back" className="back-image" />
          <samp id="text">Back to Home</samp>
        </a>
      </div>
    </>
  );
}
