"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import FileUploader from "@/components/FileUploader";

export default function NewPostClient() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("fullscreen") === "true") {
      setIsFullScreen(true);
    }
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    if (imageFile) formData.append("image", imageFile);
    if (videoFile) formData.append("video", videoFile);

    const res = await fetch("/api/posts", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      router.push("/?flash=Post+created+successfully!");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    if (e.key === ">" && ta.selectionStart > 1) {
      const before = ta.value.substring(0, ta.selectionStart);
      const match = before.match(/<([a-zA-Z0-9]+)$/);
      if (match) {
        e.preventDefault();
        const tag = match[1];
        const closing = `>${`</${tag}>`}`;
        const start = ta.selectionStart;
        ta.value = ta.value.substring(0, start) + closing + ta.value.substring(start);
        ta.selectionStart = ta.selectionEnd = start + 1;
      }
    }
    if (e.shiftKey && e.key === "Enter") {
      e.preventDefault();
      const form = ta.closest("form");
      if (form) form.requestSubmit();
    }
  };

  const toggleFullScreen = () => {
    setIsFullScreen((prev) => !prev);
    const url = new URL(window.location.href);
    if (!isFullScreen) {
      url.searchParams.set("fullscreen", "true");
    } else {
      url.searchParams.delete("fullscreen");
    }
    window.history.pushState({}, "", url.toString());
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullScreen) toggleFullScreen();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFullScreen]);

  return (
    <div className="container form-container">
      <h1 className="new-post-h">New Post</h1>
      <button className="full-screen-button" onClick={toggleFullScreen}>
        <img src="/static/full-screen.svg" alt="Full Screen" />
      </button>
      <form className={`form ${isFullScreen ? "full-screen" : ""}`} method="POST" encType="multipart/form-data" onSubmit={handleSubmit}>
        <div id="popup" className={`popup ${isFullScreen ? "show" : ""}`}>
          press <kbd>ESC</kbd> to exit full screen
        </div>
        <input
          className={`form-text-input ${isFullScreen ? "full-screen" : ""}`}
          type="text"
          name="title"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className={`editor ${isFullScreen ? "full-screen" : ""}`}
          id="editor"
          name="content"
          placeholder="Write your post here..."
          rows={5}
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <FileUploader accept="image/*" type="image" onFileChange={setImageFile} />
        <FileUploader accept="video/*" type="video" onFileChange={setVideoFile} />
        <button type="submit">Post</button>
      </form>
      <br />
      <a href="/">Back to Home</a>
    </div>
  );
}
