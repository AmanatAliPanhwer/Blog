"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import { Eye, EyeOff, ImagePlus, Loader2, Maximize2, Minimize2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FileUploader from "@/components/FileUploader";

interface PostEditorProps {
  mode: "new" | "edit";
  postId?: number;
  initialTitle?: string;
  initialContent?: string;
  initialImage?: string | null;
  initialVideoId?: number | null;
  backHref: string;
}

function draftKey(mode: "new" | "edit", postId?: number): string {
  return mode === "edit" && postId ? `draft:post:${postId}` : "draft:post:new";
}

export default function PostEditor({
  mode,
  postId,
  initialTitle = "",
  initialContent = "",
  initialImage = null,
  initialVideoId = null,
  backHref,
}: PostEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();

  const draftKeyValue = draftKey(mode, postId);
  const dirtyRef = useRef(false);
  dirtyRef.current = title !== initialTitle || content !== initialContent;

  // Restore an autosaved draft, if any.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKeyValue);
      if (!raw) return;
      const d = JSON.parse(raw) as { title?: string; content?: string };
      if (typeof d.title === "string") setTitle(d.title);
      if (typeof d.content === "string") setContent(d.content);
    } catch {
      // ignore corrupt drafts
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave as you type.
  useEffect(() => {
    if (!title && !content) return;
    const timer = setTimeout(() => {
      localStorage.setItem(draftKeyValue, JSON.stringify({ title, content }));
    }, 500);
    return () => clearTimeout(timer);
  }, [title, content, draftKeyValue]);

  // Unsaved-changes guard.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current && !submitting) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [submitting]);

  const toggleFullScreen = useCallback(() => setIsFullScreen((v) => !v), []);

  // Route a dropped / pasted file to the matching image or video uploader.
  const acceptFile = useCallback(
    (file: File) => {
      const type = file.type;
      if (type.startsWith("image/")) {
        setImageFile(file);
        toast.success("Image attached");
        return true;
      }
      if (type.startsWith("video/")) {
        setVideoFile(file);
        toast.success("Video attached");
        return true;
      }
      toast.error("Only images and videos can be attached here.");
      return false;
    },
    []
  );

  const pickingFile = (e: { target: EventTarget | null }) => {
    return (
      e.target instanceof HTMLElement &&
      !!e.target.closest("[data-dropzone], input, textarea, button, a")
    );
  };

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items || []);
      const files = items
        .map((item) => item.getAsFile())
        .filter((f): f is File => !!f);
      if (files.length === 0) return;
      e.preventDefault();
      acceptFile(files[0]);
    },
    [acceptFile]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (pickingFile(e)) return;
      const file = e.dataTransfer.files?.[0];
      if (file) acceptFile(file);
    },
    [acceptFile]
  );

  useEffect(() => {
    if (!isFullScreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullScreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullScreen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    if (e.key === ">" && ta.selectionStart > 1) {
      const before = ta.value.substring(0, ta.selectionStart);
      const match = before.match(/<([a-zA-Z0-9]+)$/);
      if (match) {
        e.preventDefault();
        const tag = match[1];
        ta.value =
          ta.value.substring(0, ta.selectionStart) +
          `>${`</${tag}>`}` +
          ta.value.substring(ta.selectionStart);
        ta.selectionStart = ta.selectionEnd = ta.selectionStart + 1;
      }
    }
    if (e.shiftKey && e.key === "Enter") {
      e.preventDefault();
      const form = ta.closest("form");
      if (form) form.requestSubmit();
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("A note needs some content.");
      return;
    }
    setSubmitting(true);
    try {
      let imageUrl: string | null = initialImage;
      let videoId: number | null = initialVideoId;

      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        fd.append("type", "image");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error("image upload failed");
        imageUrl = (await res.json()).imageUrl;
      }

      if (videoFile) {
        const fd = new FormData();
        fd.append("file", videoFile);
        fd.append("type", "video");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error("video upload failed");
        videoId = (await res.json()).videoId;
      }

      const body = { title, content, imageUrl, videoId };
      const res =
        mode === "edit"
          ? await fetch(`/api/posts?id=${postId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            })
          : await fetch("/api/posts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "failed to save");
      }

      localStorage.removeItem(draftKeyValue);
      toast.success(mode === "edit" ? "Note updated" : "Note published");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Something went wrong while saving. Your draft is kept.");
    } finally {
      setSubmitting(false);
    }
  };

  const previewHtml =
    showPreview && content
      ? DOMPurify.sanitize(content, {
          USE_PROFILES: { html: true },
          ADD_ATTR: ["target"],
        })
      : "";

  const editor = (
    <div
      className={
        isFullScreen
          ? "fixed inset-0 z-50 overflow-y-auto bg-background p-4"
          : "relative"
      }
      onPaste={handlePaste}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging ? (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-background/90">
          <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary bg-card px-10 py-8 text-primary">
            <ImagePlus className="size-8" />
            <p className="font-heading text-2xl font-semibold">
              Drop image or video to attach
            </p>
          </div>
        </div>
      ) : null}
      <div className="mx-auto flex max-w-3xl flex-col gap-4 py-2">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-primary">
            {mode === "edit" ? "edit note" : "new note"}
          </h1>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview((v) => !v)}
            >
              {showPreview ? <EyeOff /> : <Eye />}
              {showPreview ? "Write" : "Preview"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleFullScreen}
              aria-label={isFullScreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullScreen ? <Minimize2 /> : <Maximize2 />}
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            aria-label="Title (optional)"
            className="h-10 font-heading text-base"
          />

          {showPreview ? (
            <div
              className="post-markup min-h-40 rounded-lg border border-border bg-card p-4"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write your note… (HTML is fine — Shift+Enter to post)"
              rows={9}
              className="min-h-40 font-mono leading-relaxed"
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FileUploader
              accept="image/*"
              type="image"
              currentUrl={initialImage ?? undefined}
              onFileChange={setImageFile}
            />
            <FileUploader
              accept="video/*"
              type="video"
              onFileChange={setVideoFile}
            />
          </div>

          <div className="flex items-center justify-between border-t border-border/60 pt-4">
            <Button asChild variant="ghost" size="sm">
              <Link href={backHref}>Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={submitting || !content.trim()}
              className="min-w-28"
            >
              {submitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Send />
              )}
              {mode === "edit" ? "Update" : "Post"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return <>{editor}</>;
}