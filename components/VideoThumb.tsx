"use client";

import { AlertTriangle, Clock3, Loader2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoData } from "@/types";

type VideoStatus = VideoData["status"];

export function videoStatusLabel(status: VideoStatus): string {
  if (status === "processed") return "Play video";
  if (status === "processing") return "Processing";
  if (status === "failed") return "Failed to process";
  return "Queued for processing";
}

export default function VideoThumb({
  video,
  className,
}: {
  video: VideoData;
  className?: string;
}) {
  const status = video.status;

  return (
    <div
      className={cn(
        "flex aspect-video items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground",
        className
      )}
    >
      {status !== "processed" && video.url ? (
        <div className="relative size-full overflow-hidden rounded-lg bg-black">
          <video
            className="size-full"
            src={video.url}
            controls
            playsInline
            preload="metadata"
          />
          <span className="pointer-events-none absolute top-2 left-2 inline-flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-[11px] text-white/90 backdrop-blur">
            {status === "failed" ? (
              <AlertTriangle className="size-3 text-destructive" />
            ) : status === "queued" ? (
              <Clock3 className="size-3 text-primary" />
            ) : (
              <Loader2 className="size-3 animate-spin" />
            )}
            {status === "failed"
              ? "Failed to process — raw file"
              : status === "queued"
                ? "Queued — processing…"
                : "Processing — raw file"}
          </span>
        </div>
      ) : status === "processed" ? (
        <span className="flex items-center gap-2 font-medium text-foreground">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Play className="size-4 fill-current" />
          </span>
          Play video
        </span>
      ) : status === "failed" ? (
        <span className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-4" />
          Failed to process
        </span>
      ) : status === "processing" ? (
        <span className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin text-primary" />
          Processing…
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <Clock3 className="size-4 text-primary" />
          Queued for processing…
        </span>
      )}
    </div>
  );
}