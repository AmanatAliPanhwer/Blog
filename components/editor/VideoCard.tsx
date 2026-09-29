"use client";

import { useEffect } from "react";
import { AlertTriangle, Clock3, Loader2, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import VideoPlayer from "@/components/VideoPlayer";
import type { AttachedVideo } from "@/components/editor/RichTextEditor";

const POLL_MS = 5000;
const PENDING = new Set(["queued", "processing"]);

interface VideoCardProps {
  video: AttachedVideo;
  onClear: () => void;
  onStatusChange: (next: AttachedVideo) => void;
}

/**
 * The Post's Video while editing. A Video is attached to a Post rather than
 * inlined in the Post Body, because the ffmpeg pipeline replaces the raw
 * upload with an HLS playlist and drops the original file.
 */
export default function VideoCard({ video, onClear, onStatusChange }: VideoCardProps) {
  const { id, url, status } = video;
  const isPending = PENDING.has(status);

  useEffect(() => {
    if (id === null || !PENDING.has(status)) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/videos/${id}`);
        if (!res.ok) return;
        const body = (await res.json()) as {
          video?: { id: number; status: string; url: string };
        };
        if (!body.video) return;
        if (body.video.status === status && body.video.url === url) return;
        onStatusChange({
          id: body.video.id,
          status: body.video.status,
          url: body.video.url,
        });
      } catch {
        // A dropped poll is not worth interrupting the draft over; the next
        // tick tries again.
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [id, status, url, onStatusChange]);

  return (
    <div className="space-y-2 border-t border-border px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Video aria-hidden className="size-4 text-primary" />
          Attached video
          <StatusBadge status={status} />
        </p>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={onClear}
          className="text-muted-foreground hover:text-destructive"
        >
          <X aria-hidden />
          Remove
        </Button>
      </div>

      {id === null ? (
        <p className="text-xs text-muted-foreground">Uploading…</p>
      ) : status === "processed" && url ? (
        <VideoPlayer video={{ id, status, url }} />
      ) : url ? (
        <div className="relative overflow-hidden rounded-lg border border-border bg-black">
          <video
            src={url}
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full"
            aria-label="Video preview while processing"
          />
          <span className="pointer-events-none absolute top-2 left-2 inline-flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-[11px] text-white">
            {status === "failed" ? (
              <AlertTriangle aria-hidden className="size-3 text-destructive" />
            ) : status === "queued" ? (
              <Clock3 aria-hidden className="size-3 text-primary" />
            ) : (
              <Loader2 aria-hidden className="size-3 animate-spin" />
            )}
            {statusLabel(status)}
          </span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{statusLabel(status)}</p>
      )}

      <p className="text-xs text-muted-foreground">
        This video attaches to the note itself — it is transcoded to HLS and
        played back with the post, so it is not inlined in the body text.
      </p>
    </div>
  );
}

function statusLabel(status: string): string {
  if (status === "processed") return "Ready to play";
  if (status === "processing") return "Processing — raw file";
  if (status === "failed") return "Failed to process — raw file";
  return "Queued for processing…";
}

function StatusBadge({ status }: { status: string }) {
  const isPending = PENDING.has(status);
  return (
    <span
      className={
        status === "failed"
          ? "rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] text-destructive"
          : isPending
            ? "rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-primary"
            : "rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
      }
    >
      {statusLabel(status)}
    </span>
  );
}
