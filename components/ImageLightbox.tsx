"use client";

import { useEffect, useRef } from "react";

interface ImageLightboxProps {
  src: string;
  alt?: string;
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

export default function ImageLightbox({ src, alt }: ImageLightboxProps) {
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadViewerJS();
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const gallery = galleryRef.current;
    if (!gallery) return;

    const img = gallery.querySelector("img");
    if (!img) return;

    // Use global Viewer from the loaded script
    const Viewer = (window as unknown as Record<string, unknown>).Viewer as new (el: HTMLElement, opts?: Record<string, unknown>) => { show: () => void };
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

  return (
    <div className="gallery" ref={galleryRef}>
      <img src={src} alt={alt || "Post Image"} className="image" loading="lazy" onClick={handleClick} />
    </div>
  );
}
