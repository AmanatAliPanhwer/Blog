"use client";

import { checkUpload, type UploadKind } from "@/lib/uploads";

export class MediaUploadError extends Error {}

export interface UploadResult {
  imageUrl?: string;
  videoId?: number;
  videoUrl?: string;
}

async function responseError(xhr: XMLHttpRequest): Promise<MediaUploadError> {
  const fallback = `Upload failed (${xhr.status || "no response"})`;
  try {
    const parsed = JSON.parse(xhr.responseText) as { error?: string };
    return new MediaUploadError(parsed.error || fallback);
  } catch {
    return new MediaUploadError(fallback);
  }
}

/**
 * Uploads a file to `/api/upload`, reporting byte progress along the way.
 * `fetch` cannot report request-body progress, so this goes through XHR.
 */
export function uploadMedia(
  file: File,
  kind: UploadKind,
  onProgress: (fraction: number) => void
): Promise<UploadResult> {
  const rejection = checkUpload(file, kind);
  if (rejection) {
    return Promise.reject(new MediaUploadError(rejection.message));
  }

  return new Promise<UploadResult>((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", kind);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    });

    xhr.addEventListener("load", async () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(await responseError(xhr));
        return;
      }
      try {
        resolve(JSON.parse(xhr.responseText) as UploadResult);
      } catch {
        reject(new MediaUploadError("Upload returned an unreadable response"));
      }
    });

    xhr.addEventListener("error", () =>
      reject(new MediaUploadError("Network error — the upload did not finish."))
    );
    xhr.addEventListener("abort", () =>
      reject(new MediaUploadError("Upload cancelled."))
    );

    xhr.send(formData);
  });
}
