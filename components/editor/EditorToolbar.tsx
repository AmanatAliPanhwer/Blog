"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Underline,
  Undo2,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  editor: Editor;
  onPickImage: () => void;
  onPickVideo: () => void;
  disabled?: boolean;
}

export default function EditorToolbar({
  editor,
  onPickImage,
  onPickVideo,
  disabled,
}: EditorToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      aria-controls="post-body-editor"
      className="flex flex-wrap items-center gap-0.5 border-b border-border bg-card/60 px-2 py-1.5"
    >
      <ToolbarButton
        label="Undo"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={disabled || !editor.can().undo()}
      >
        <Undo2 />
      </ToolbarButton>
      <ToolbarButton
        label="Redo"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={disabled || !editor.can().redo()}
      >
        <Redo2 />
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        label="Paragraph"
        active={editor.isActive("paragraph")}
        onClick={() => editor.chain().focus().setParagraph().run()}
        disabled={disabled}
      >
        <Pilcrow />
      </ToolbarButton>
      {[1, 2, 3].map((level) => (
        <ToolbarButton
          key={level}
          label={`Heading ${level}`}
          active={editor.isActive("heading", { level })}
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleHeading({ level: level as 1 | 2 | 3 })
              .run()
          }
          disabled={disabled}
        >
          {level === 1 ? <Heading1 /> : level === 2 ? <Heading2 /> : <Heading3 />}
        </ToolbarButton>
      ))}

      <Separator />

      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={disabled}
      >
        <Bold />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={disabled}
      >
        <Italic />
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        disabled={disabled}
      >
        <Underline />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={disabled}
      >
        <Strikethrough />
      </ToolbarButton>
      <ToolbarButton
        label="Inline code"
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={disabled}
      >
        <Code />
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        disabled={disabled}
      >
        <List />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        disabled={disabled}
      >
        <ListOrdered />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        disabled={disabled}
      >
        <Quote />
      </ToolbarButton>
      <ToolbarButton
        label="Code block"
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        disabled={disabled}
      >
        <SquareCode />
      </ToolbarButton>
      <ToolbarButton
        label="Divider"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        disabled={disabled}
      >
        <Minus />
      </ToolbarButton>

      <Separator />

      {editor.isActive("link") ? (
        <ToolbarButton
          label="Remove link"
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={disabled}
        >
          <Link2Off />
        </ToolbarButton>
      ) : (
        <ToolbarButton
          label="Add link"
          onClick={() => {
            const href = window.prompt("Link URL");
            if (!href) return;
            editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
          }}
          disabled={disabled}
        >
          <Link2 />
        </ToolbarButton>
      )}
      <ToolbarButton label="Insert image" onClick={onPickImage} disabled={disabled}>
        <ImagePlus />
      </ToolbarButton>
      <ToolbarButton
        label="Attach video"
        onClick={onPickVideo}
        disabled={disabled}
      >
        <Video />
      </ToolbarButton>
    </div>
  );
}

function Separator() {
  return (
    <span
      aria-hidden
      className="mx-1 h-5 w-px shrink-0 bg-border"
    />
  );
}

interface ToolbarButtonProps {
  label: string;
  onClick: () => void;
  children: React.ReactElement;
  active?: boolean;
  disabled?: boolean;
}

function ToolbarButton({ label, onClick, children, active, disabled }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(active && "bg-primary/15 text-primary")}
    >
      {children}
    </Button>
  );
}
