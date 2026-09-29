"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FileUploader from "@/components/FileUploader";
import RichTextEditor, {
  type AttachedVideo,
} from "@/components/editor/RichTextEditor";

interface PostEditorProps {
  mode: "new" | "edit";
  postId?: number;
  initialTitle?: string;
  initialContent?: string;
  initialImage?: string | null;
  initialVideo?: AttachedVideo | null;
  backHref: string;
}

function draftKey(mode: "new" | "edit", postId?: number): string {
  return mode === "edit" && postId ? `draft:post:${postId}` : "draft:post:new";
}

/**
 * A rich text editor always emits a document, even when nothing was typed, so
 * "has content" is not a plain string check: a body holding only an image or
 * an embed still counts.
 */
function isEmptyBody(html: string): boolean {
  if (!html) return true;
  const withoutMedia = html.replace(/<(img|video|audio|iframe)\b[^>]*>/gi, "");
  return withoutMedia.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() === "";
}

export default function PostEditor({
  mode,
  postId,
  initialTitle = "",
  initialContent = "",
  initialImage = null,
  initialVideo = null,
  backHref,
}: PostEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [video, setVideo] = useState<AttachedVideo | null>(initialVideo);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  useEffect(() => {
    if (!isFullScreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullScreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullScreen]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isEmptyBody(content)) {
      toast.error("A note needs some content.");
      return;
    }
    setSubmitting(true);
    try {
      let imageUrl: string | null = initialImage;

      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        fd.append("type", "image");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Image upload failed");
        }
        imageUrl = (await res.json()).imageUrl;
      }

      const body = {
        title,
        content,
        imageUrl,
        videoId: video?.id ?? null,
      };
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
    } catch (e) {
      toast.error(
        e instanceof Error && e.message !== "failed to save"
          ? e.message
          : "Something went wrong while saving. Your draft is kept."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={
        isFullScreen
          ? "fixed inset-0 z-50 overflow-y-auto bg-background p-4"
          : "relative"
      }
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 py-2">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-primary">
          {mode === "edit" ? "edit note" : "new note"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            aria-label="Title (optional)"
            className="h-10 font-heading text-base"
          />

          <RichTextEditor
            value={content}
            onChange={setContent}
            video={video}
            onVideoChange={setVideo}
            isFullScreen={isFullScreen}
            onToggleFullScreen={toggleFullScreen}
          />

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Cover image — shown in the Feed. Images you drop or paste into the
              body above are handled separately.
            </p>
            <FileUploader
              accept="image/*"
              type="image"
              currentUrl={initialImage ?? undefined}
              onFileChange={setImageFile}
            />
          </div>

          <div className="flex items-center justify-between border-t border-border/60 pt-4">
            <Button asChild variant="ghost" size="sm">
              <Link href={backHref}>Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={submitting || isEmptyBody(content)}
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
}
