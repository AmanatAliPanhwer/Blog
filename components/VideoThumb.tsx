"use client";

import { AlertTriangle, Clock3, Loader2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoData } from "@/types";

type VideoStatus = VideoData["status"];

export function videoStatusLabel(status: VideoStatus): string {
  if (status === "processed") return "Play video";
  if (status === "processing") return "Processing…";
  if (status === "failed") return "Failed to process";
  return "Queued for processing…";
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
      {status === "processed" ? (
        <span className="flex items-center gap-2 font-medium text-foreground">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Play className="size-4 fill-current" />
          </span>
          Play video
        </span>
      ) : status === "processing" ? (
        <span className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin text-primary" />
          Processing…
        </span>
      ) : status === "failed" ? (
        <span className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-4" />
          Failed to process
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