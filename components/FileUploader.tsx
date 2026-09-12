"use client";

import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { File as FileIcon, ImagePlus, Video, X } from "lucide-react";
import { cn } from "@/lib/utils";
import ImageLightbox from "@/components/ImageLightbox";

interface FileUploaderProps {
  accept: string;
  type: "image" | "video";
  currentUrl?: string;
  onFileChange: (file: File | null) => void;
}

export default function FileUploader({
  accept,
  type,
  currentUrl,
  onFileChange,
}: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isImage = type === "image";

  const handleFile = (f: File | null) => {
    setFile(f);
    onFileChange(f);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith(`${type}/`)) handleFile(f);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div className="space-y-2">
      {currentUrl && isImage && !file ? (
        <ImageLightbox
          src={currentUrl}
          alt="Current upload"
          className="aspect-video rounded-md border border-border object-cover"
        />
      ) : null}

      <div
        role="button"
        tabIndex={0}
        data-dropzone
        aria-label={isImage ? "Choose image" : "Choose video"}
        onClick={() => inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        className={cn(
          "flex h-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/70 focus-visible:border-primary focus-visible:outline-none",
          dragging && "border-primary bg-primary/5"
        )}
      >
        {file ? (
          <>
            <FileIcon className="size-5 text-primary" />
            <span className="max-w-full truncate px-4 text-xs">{file.name}</span>
            <span className="text-xs">{formatSize(file.size)}</span>
          </>
        ) : (
          <>
            {isImage ? (
              <ImagePlus className="size-6" />
            ) : (
              <Video className="size-6" />
            )}
            <span className="text-sm font-medium">
              Add {isImage ? "image" : "video"}
            </span>
            <span className="text-xs">or drag &amp; drop here</span>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      {file ? (
        <button
          type="button"
          onClick={() => handleFile(null)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
        >
          <X className="size-3" />
          Remove {isImage ? "image" : "video"}
        </button>
      ) : null}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}