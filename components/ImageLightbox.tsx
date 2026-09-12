"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  className?: string;
}

// Load ViewerJS once globally
let viewerLoaded = false;
function loadViewerJS() {
  if (viewerLoaded) return;
  viewerLoaded = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://cdnjs.cloudflare.com/ajax/libs/viewerjs/1.11.7/viewer.min.css";
  document.head.appendChild(link);
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/viewerjs/1.11.7/viewer.min.js";
  document.head.appendChild(script);
}

export default function ImageLightbox({ src, alt, className }: ImageLightboxProps) {
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadViewerJS();
  }, []);

  const handleClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const gallery = galleryRef.current;
    if (!gallery) return;

    const img = gallery.querySelector("img");
    if (!img) return;

    // Use global Viewer from the loaded script
    const Viewer = (window as unknown as Record<string, unknown>).Viewer as new (
      el: HTMLElement,
      opts?: Record<string, unknown>
    ) => { show: () => void };
    if (typeof Viewer !== "function") {
      // Viewer not loaded yet, open in new tab as fallback
      window.open(src, "_blank");
      return;
    }
    const viewer = new Viewer(gallery, {
      movable: true,
      zoomable: true,
      fullscreen: true,
      toolbar: false,
    });
    viewer.show();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLImageElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      handleClick(e);
    }
  };

  return (
    <div className="gallery" ref={galleryRef}>
      <img
        src={src}
        alt={alt || "Post Image"}
        className={cn("image w-full cursor-zoom-in rounded-[10px]", className)}
        loading="lazy"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={alt ? `View full-size image: ${alt}` : "View full-size image"}
      />
    </div>
  );
}
