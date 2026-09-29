"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent as ReactDragEvent,
} from "react";
import { EditorContent, ReactNodeViewRenderer, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import TiptapImage from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import DOMPurify from "dompurify";
import { toast } from "sonner";
import {
  Braces,
  FileCode2,
  Loader2,
  Maximize2,
  Minimize2,
  Pencil,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadMedia, MediaUploadError } from "@/lib/editor/uploadMedia";
import EditorToolbar from "@/components/editor/EditorToolbar";
import ImageNodeView from "@/components/editor/ImageNodeView";
import VideoCard from "@/components/editor/VideoCard";

export type EditorMode = "visual" | "markdown" | "html";

export interface AttachedVideo {
  id: number | null;
  url: string | null;
  status: string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  video: AttachedVideo | null;
  onVideoChange: (video: AttachedVideo | null) => void;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
}

interface PendingUpload {
  key: string;
  name: string;
  kind: "image" | "video";
  progress: number;
}

const MODES: { id: EditorMode; label: string; icon: typeof Pencil }[] = [
  { id: "visual", label: "Visual", icon: Pencil },
  { id: "markdown", label: "Markdown", icon: FileCode2 },
  { id: "html", label: "HTML", icon: Braces },
];

const PREVIEW_OPTIONS = { USE_PROFILES: { html: true }, ADD_ATTR: ["target"] };

export default function RichTextEditor({
  value,
  onChange,
  video,
  onVideoChange,
  isFullScreen,
  onToggleFullScreen,
}: RichTextEditorProps) {
  const [mode, setMode] = useState<EditorMode>("visual");
  const [source, setSource] = useState("");
  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const sourceId = useId();

  // Refs so the editor is built once and never rebuilt mid-typing. The editor
  // itself lives in a ref too: ProseMirror's `editorProps` are captured when
  // the editor is created, so anything they call must read through a ref
  // rather than closing over the render they were created in.
  const editorRef = useRef<Editor | null>(null);
  const lastEmitted = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onVideoChangeRef = useRef(onVideoChange);
  onVideoChangeRef.current = onVideoChange;

  const setPreview = useCallback((html: string) => {
    setPreviewHtml(html ? DOMPurify.sanitize(html, PREVIEW_OPTIONS) : "");
  }, []);

  const trackUpload = useCallback(
    (key: string, name: string, kind: "image" | "video", progress: number) => {
      setUploads((current) => {
        const known = current.some((u) => u.key === key);
        return known
          ? current.map((u) => (u.key === key ? { ...u, progress } : u))
          : [...current, { key, name, kind, progress }];
      });
    },
    []
  );

  const dropUpload = useCallback(
    (key: string) => setUploads((current) => current.filter((u) => u.key !== key)),
    []
  );

  const uploadOne = useCallback(
    async (file: File, kind: "image" | "video", key: string) => {
      trackUpload(key, file.name, kind, 0);
      try {
        return await uploadMedia(file, kind, (fraction) =>
          trackUpload(key, file.name, kind, fraction)
        );
      } catch (e) {
        toast.error(
          e instanceof MediaUploadError ? e.message : "Upload failed. Try again."
        );
        return null;
      } finally {
        dropUpload(key);
      }
    },
    [dropUpload, trackUpload]
  );

  const modeRef = useRef(mode);
  modeRef.current = mode;

  const insertImage = useCallback((src: string, alt: string) => {
    if (modeRef.current !== "visual") {
      const ta = sourceRef.current;
      const at = ta ? ta.selectionStart : 0;
      const tag = `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}">`;
      setSource((current) =>
        current.slice(0, at) + tag + current.slice(at)
      );
      // Leave the caret after the tag so typing continues from there.
      requestAnimationFrame(() => {
        const el = sourceRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(at + tag.length, at + tag.length);
      });
      return;
    }
    editorRef.current?.chain().focus().setImage({ src, alt }).run();
  }, []);

  /**
   * Images become Post Body content. A video becomes the Post's Video, because
   * the HLS pipeline replaces the raw upload and a Post holds one video.
   */
  const ingestFiles = useCallback(
    async (files: File[]) => {
      for (const [index, file] of files.entries()) {
        if (!file.type) {
          toast.error(`"${file.name}" has no detectable file type.`);
          continue;
        }
        const key = `${index}-${file.name}-${file.size}-${Date.now()}`;
        const kind: "image" | "video" = file.type.startsWith("video/")
          ? "video"
          : "image";

        const result = await uploadOne(file, kind, key);
        if (!result) continue;

        if (kind === "video") {
          onVideoChangeRef.current({
            id: result.videoId ?? null,
            url: result.videoUrl ?? null,
            status: "queued",
          });
          toast.success("Video attached. It plays once processing finishes.");
        } else if (result.imageUrl) {
          insertImage(result.imageUrl, altFromFileName(file.name));
        }
      }
    },
    [insertImage, uploadOne]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer" },
        },
      }),
      TiptapImage.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { loading: "lazy" },
      }).extend({ addNodeView: () => ReactNodeViewRenderer(ImageNodeView) }),
      Placeholder.configure({
        placeholder:
          "Write your note… drop or paste an image anywhere. Enter plus Shift posts.",
      }),
      Markdown,
    ],
    content: value,
    editorProps: {
      attributes: {
        id: "post-body-editor",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Post body",
        class: "post-markup min-h-64 px-4 py-3 focus:outline-none",
      },
      handlePaste: (_view, event) => {
        const files = toFileArray(event.clipboardData?.files);
        if (files.length === 0) return false;
        event.preventDefault();
        void ingestFiles(files);
        return true;
      },
      handleDrop: (_view, event) => {
        // An in-editor move carries no files, so anything with files is a real
        // upload. Dragging formatted content stays ProseMirror's business.
        const files = toFileArray(event.dataTransfer?.files);
        if (files.length === 0) return false;
        event.preventDefault();
        void ingestFiles(files);
        return true;
      },
      handleKeyDown: (view, event) => {
        if (event.key !== "Enter") return false;
        const submits =
          event.shiftKey || event.metaKey || (event.ctrlKey && !event.altKey);
        if (!submits) return false;
        const form = view.dom.closest("form");
        if (!form) return false;
        event.preventDefault();
        form.requestSubmit();
        return true;
      },
    },
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML();
      lastEmitted.current = html;
      onChangeRef.current(html);
    },
  });

  editorRef.current = editor;

  // Apply a value that came from outside the editor, such as a restored draft.
  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    editorRef.current?.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  // Parse Markdown/HTML edits into the document on a short debounce.
  useEffect(() => {
    if (mode === "visual" || !editor) return;
    const timer = setTimeout(() => {
      editor.commands.setContent(source, {
        contentType: mode === "markdown" ? "markdown" : "html",
        emitUpdate: true,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [source, mode, editor]);

  // Keep the preview pane in step with the document.
  useEffect(() => {
    if (mode === "visual" || !editor) return;
    const sync = () => setPreview(editor.getHTML());
    editor.on("update", sync);
    return () => {
      editor.off("update", sync);
    };
  }, [mode, editor, setPreview]);

  const switchMode = useCallback(
    (next: EditorMode) => {
      if (!editor || next === mode) return;
      if (next === "markdown") {
        setSource(editor.getMarkdown());
      } else if (next === "html") {
        setSource(editor.getHTML());
      } else {
        // Back to visual: flush the source so the last keystrokes are kept.
        editor.commands.setContent(source, {
          contentType: mode === "markdown" ? "markdown" : "html",
          emitUpdate: true,
        });
      }
      setPreview(editor.getHTML());
      setMode(next);
    },
    [editor, mode, setPreview, source]
  );

  // Container-level drop and paste, for the Markdown and HTML modes where
  // ProseMirror is not mounted.
  const onContainerDrop = useCallback(
    (e: ReactDragEvent<HTMLDivElement>) => {
      if (mode === "visual") return;
      const files = toFileArray(e.dataTransfer?.files);
      if (files.length === 0) return;
      e.preventDefault();
      setIsDragging(false);
      void ingestFiles(files);
    },
    [ingestFiles, mode]
  );

  const onContainerPaste = useCallback(
    (e: ReactClipboardEvent<HTMLDivElement>) => {
      if (mode === "visual") return;
      const files = toFileArray(e.clipboardData?.files);
      if (files.length === 0) return;
      e.preventDefault();
      void ingestFiles(files);
    },
    [ingestFiles, mode]
  );

  const onDragOver = useCallback((e: ReactDragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer?.types.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: ReactDragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsDragging(false);
  }, []);

  return (
    <div
      data-dropzone
      className={cn(
        "relative flex flex-col overflow-hidden rounded-lg border border-border bg-card",
        isDragging && "border-primary"
      )}
      onDrop={onContainerDrop}
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      onPaste={onContainerPaste}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-2 py-1.5">
        <div
          role="group"
          aria-label="Editing mode"
          className="flex items-center gap-0.5"
        >
          {MODES.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={mode === id}
              onClick={() => switchMode(id)}
              className={cn(mode === id && "bg-primary/15 text-primary")}
            >
              <Icon aria-hidden />
              {label}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={isFullScreen ? "Exit fullscreen" : "Fullscreen"}
          title={isFullScreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
          onClick={onToggleFullScreen}
        >
          {isFullScreen ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
        </Button>
      </div>

      {mode === "visual" && editor ? (
        <EditorToolbar
          editor={editor}
          onPickImage={() => imageInputRef.current?.click()}
          onPickVideo={() => videoInputRef.current?.click()}
        />
      ) : null}

      {mode === "visual" ? (
        <EditorContent editor={editor} className="post-editor-surface" />
      ) : (
        <div className="grid md:grid-cols-2">
          <div className="flex flex-col">
            <label
              htmlFor={sourceId}
              className="px-4 pt-2 text-xs text-muted-foreground"
            >
              {mode === "markdown" ? "Markdown source" : "HTML source"}
            </label>
            <textarea
              id={sourceId}
              ref={sourceRef}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              spellCheck={false}
              placeholder={
                mode === "markdown"
                  ? "## Shipped it\n\nDrop an image in here, or paste one from the clipboard."
                  : "<p>Write HTML here.</p>"
              }
              className="min-h-64 w-full resize-y bg-transparent px-4 py-3 font-mono text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="border-t border-border md:border-t-0 md:border-l">
            <p className="px-4 pt-2 text-xs text-muted-foreground">Preview</p>
            <div
              role="region"
              aria-label="Rendered preview"
              aria-live="polite"
              className="post-markup min-h-64 px-4 py-3"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      )}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const files = toFileArray(e.target.files);
          e.target.value = "";
          void ingestFiles(files);
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const files = toFileArray(e.target.files);
          e.target.value = "";
          void ingestFiles(files);
        }}
      />

      <UploadsBar uploads={uploads} />

      {video ? (
        <VideoCard
          video={video}
          onClear={() => onVideoChange(null)}
          onStatusChange={onVideoChange}
        />
      ) : null}

      {isDragging ? (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-background/85">
          <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-primary bg-card px-8 py-6 text-center text-primary">
            <Upload aria-hidden className="size-7" />
            <p className="font-heading text-lg font-semibold">
              Drop to upload — images go inline, videos attach to the note
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UploadsBar({ uploads }: { uploads: PendingUpload[] }) {
  if (uploads.length === 0) return null;
  return (
    <ul
      aria-live="polite"
      aria-label="Uploads in progress"
      className="space-y-1 border-t border-border px-3 py-2"
    >
      {uploads.map((upload) => (
        <li
          key={upload.key}
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <Loader2
            aria-hidden
            className="size-3.5 shrink-0 animate-spin text-primary"
          />
          <span className="min-w-0 flex-1 truncate">
            Uploading {upload.kind}{" "}
            <span className="text-foreground">{upload.name}</span> —{" "}
            {Math.round(upload.progress * 100)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

function toFileArray(list: FileList | null | undefined): File[] {
  if (!list) return [];
  return Array.from(list).filter((file) => file.size > 0);
}

function altFromFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return base.replace(/[-_]+/g, " ").trim();
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}
