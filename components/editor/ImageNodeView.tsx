"use client";

import { useEffect, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { ImageIcon, Trash2 } from "lucide-react";

/**
 * Renders an image in the editor as a figure: the image itself, an alt-text
 * field, and a remove control. Alt text is optional for a Post Body image but
 * the field makes it discoverable rather than hidden in a dialog.
 */
export default function ImageNodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const src = String(node.attrs.src ?? "");
  const [alt, setAlt] = useState(String(node.attrs.alt ?? ""));

  useEffect(() => {
    setAlt(String(node.attrs.alt ?? ""));
  }, [node.attrs.alt]);

  return (
    <NodeViewWrapper
      data-drag-handle
      className={
        selected
          ? "my-3 rounded-lg border-2 border-primary"
          : "my-3 rounded-lg border-2 border-transparent"
      }
    >
      <figure className="overflow-hidden rounded-lg border border-border bg-muted/30">
        {/* A plain <img>, not next/image: blob and storage URLs are unknown at build time. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-96 w-full object-contain"
          draggable={false}
        />
        <figcaption className="flex flex-wrap items-center gap-2 border-t border-border px-2 py-1.5">
          <label className="flex flex-1 items-center gap-2 text-xs text-muted-foreground">
            <ImageIcon aria-hidden className="size-3.5 shrink-0" />
            <span className="sr-only">Alt text for this image</span>
            <input
              type="text"
              value={alt}
              placeholder="Describe this image…"
              onChange={(e) => {
                setAlt(e.target.value);
                updateAttributes({ alt: e.target.value });
              }}
              className="min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </label>
          <button
            type="button"
            onClick={deleteNode}
            aria-label="Remove image"
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Trash2 aria-hidden className="size-3.5" />
            Remove
          </button>
        </figcaption>
      </figure>
    </NodeViewWrapper>
  );
}
