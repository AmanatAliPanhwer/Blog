export type UploadKind = "image" | "video";

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/heic",
] as const;

export const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "video/ogg",
] as const;

const MIB = 1024 * 1024;

export const DEFAULT_MAX_IMAGE_BYTES = 10 * MIB;
export const DEFAULT_MAX_VIDEO_BYTES = 256 * MIB;

function positiveIntFromEnv(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function maxBytesFor(kind: UploadKind): number {
  return kind === "video"
    ? positiveIntFromEnv(
        process.env.MAX_VIDEO_UPLOAD_BYTES,
        DEFAULT_MAX_VIDEO_BYTES
      )
    : positiveIntFromEnv(
        process.env.MAX_IMAGE_UPLOAD_BYTES,
        DEFAULT_MAX_IMAGE_BYTES
      );
}

export function allowedMimeTypesFor(kind: UploadKind): readonly string[] {
  return kind === "video" ? VIDEO_MIME_TYPES : IMAGE_MIME_TYPES;
}

export function isAllowedMimeType(kind: UploadKind, mimeType: string): boolean {
  return allowedMimeTypesFor(kind).includes(
    mimeType.toLowerCase() as (typeof IMAGE_MIME_TYPES)[number]
  );
}

export function isUploadKind(value: unknown): value is UploadKind {
  return value === "image" || value === "video";
}

const MIME_TYPE_LABELS: Record<string, string> = {
  "image/jpeg": ".jpeg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/heic": ".heic",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/x-matroska": ".mkv",
  "video/ogg": ".ogg",
};

/**
 * Human-readable label for a MIME type, so rejections read like
 * ".mp4, .webm" rather than a list of type strings.
 */
export function mimeTypeLabel(mimeType: string): string {
  return MIME_TYPE_LABELS[mimeType.toLowerCase()] ?? `.${mimeType.split("/")[1] ?? mimeType}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MIB) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * MIB) return `${(bytes / MIB).toFixed(1)} MB`;
  return `${(bytes / (1024 * MIB)).toFixed(2)} GB`;
}

export interface UploadRejection {
  code: "unsupported_type" | "too_large";
  message: string;
}

/**
 * Single place where a file is judged acceptable, so the browser and the
 * upload route agree on what can be attached to a Post. Returns `null` when
 * the file is good to go.
 */
export function checkUpload(
  file: { type: string; size: number },
  kind: UploadKind
): UploadRejection | null {
  if (!isAllowedMimeType(kind, file.type)) {
    const accepted = allowedMimeTypesFor(kind)
      .map(mimeTypeLabel)
      .join(", ");
    return {
      code: "unsupported_type",
      message:
        kind === "image"
          ? `That file type isn't supported here. Images: ${accepted}.`
          : `That file type isn't supported here. Videos: ${accepted}.`,
    };
  }

  const limit = maxBytesFor(kind);
  if (file.size > limit) {
    return {
      code: "too_large",
      message: `That ${kind} is ${formatBytes(
        file.size
      )} — the limit is ${formatBytes(limit)}.`,
    };
  }

  return null;
}
