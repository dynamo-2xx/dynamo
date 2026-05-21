import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange?: (html: string) => void;
  onEditorReady?: (editor: Editor | null) => void;
  onFocus?: () => void;
  editable?: boolean;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  /** Restrict input length on plain-text basis. */
  maxPlainLength?: number;
}

/** Wrap legacy plain text into a paragraph so TipTap loads it losslessly. */
const normalize = (v: string): string => {
  if (!v) return "";
  if (v.trimStart().startsWith("<")) return v;
  return `<p>${v.replace(/\n/g, "<br/>")}</p>`;
};

const RichTextEditor = ({
  value,
  onChange,
  onEditorReady,
  onFocus,
  editable = true,
  placeholder,
  className,
  minHeight = "240px",
  maxPlainLength,
}: Props) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content: normalize(value),
    editable,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none font-body text-sm leading-relaxed",
          "[&_p]:my-2 [&_h1]:font-display [&_h1]:text-2xl [&_h2]:font-display [&_h2]:text-lg",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_a]:underline [&_a]:text-foreground",
          className,
        ),
        style: `min-height:${minHeight}`,
      },
      handleKeyDown: (_view, event) => {
        if (!maxPlainLength) return false;
        const len = editor?.getText().length ?? 0;
        const isCtrl = event.metaKey || event.ctrlKey;
        if (isCtrl) return false;
        const navKeys = [
          "Backspace",
          "Delete",
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Home",
          "End",
          "Tab",
        ];
        if (navKeys.includes(event.key)) return false;
        if (len >= maxPlainLength) {
          event.preventDefault();
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) return true;
            const reader = new FileReader();
            reader.onload = () => {
              const url = reader.result as string;
              editor?.chain().focus().setImage({ src: url }).run();
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getHTML());
    },
    onFocus: () => {
      onFocus?.();
    },
  });

  // Sync external value changes (e.g. AI-generated drafts).
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = normalize(value);
    if (next && next !== current) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    onEditorReady?.(editor ?? null);
    return () => onEditorReady?.(null);
  }, [editor, onEditorReady]);

  if (placeholder && editor?.isEmpty) {
    // Lightweight placeholder via data attribute on the rendered element
  }

  return (
    <div className="relative w-full">
      <EditorContent editor={editor} />
      {placeholder && editor?.isEmpty && (
        <div className="pointer-events-none absolute top-2 left-0 text-sm text-muted-foreground font-body">
          {placeholder}
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
export type { Editor };