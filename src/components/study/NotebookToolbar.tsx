import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  Undo2,
  Redo2,
} from "lucide-react";
import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";

interface Props {
  editor: Editor | null;
  className?: string;
}

const Btn = ({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    className={cn(
      "h-8 w-8 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors",
      active && "bg-accent text-foreground",
      disabled && "opacity-40 cursor-default hover:bg-transparent hover:text-muted-foreground",
    )}
  >
    {children}
  </button>
);

const Divider = () => <div className="w-px h-5 bg-border mx-1" />;

/**
 * Constant formatting toolbar. Buttons keep the same position across all tabs;
 * they no-op when no rich-text editor is focused (e.g. on Dynamo tab).
 */
const NotebookToolbar = ({ editor, className }: Props) => {
  const run = (fn: (chain: any) => any) => () => {
    if (!editor) return;
    fn(editor.chain().focus()).run();
  };
  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    !!editor && editor.isActive(name, attrs as any);

  const promptLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 px-2 py-1.5 border border-border rounded-md bg-background mb-2 overflow-x-auto",
        className,
      )}
    >
      <Btn label="Bold" onClick={run((c) => c.toggleBold())} active={isActive("bold")}>
        <Bold className="w-3.5 h-3.5" />
      </Btn>
      <Btn label="Italic" onClick={run((c) => c.toggleItalic())} active={isActive("italic")}>
        <Italic className="w-3.5 h-3.5" />
      </Btn>
      <Btn
        label="Underline"
        onClick={run((c) => c.toggleUnderline())}
        active={isActive("underline")}
      >
        <UnderlineIcon className="w-3.5 h-3.5" />
      </Btn>
      <Btn
        label="Strikethrough"
        onClick={run((c) => c.toggleStrike())}
        active={isActive("strike")}
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </Btn>
      <Divider />
      <Btn
        label="Heading 1"
        onClick={run((c) => c.toggleHeading({ level: 1 }))}
        active={isActive("heading", { level: 1 })}
      >
        <Heading1 className="w-3.5 h-3.5" />
      </Btn>
      <Btn
        label="Heading 2"
        onClick={run((c) => c.toggleHeading({ level: 2 }))}
        active={isActive("heading", { level: 2 })}
      >
        <Heading2 className="w-3.5 h-3.5" />
      </Btn>
      <Divider />
      <Btn
        label="Bulleted list"
        onClick={run((c) => c.toggleBulletList())}
        active={isActive("bulletList")}
      >
        <List className="w-3.5 h-3.5" />
      </Btn>
      <Btn
        label="Numbered list"
        onClick={run((c) => c.toggleOrderedList())}
        active={isActive("orderedList")}
      >
        <ListOrdered className="w-3.5 h-3.5" />
      </Btn>
      <Divider />
      <Btn label="Link" onClick={promptLink} active={isActive("link")}>
        <LinkIcon className="w-3.5 h-3.5" />
      </Btn>
      <Divider />
      <Btn label="Undo" onClick={run((c) => c.undo())} disabled={!editor || editor.isDestroyed || !editor.can().undo()}>
        <Undo2 className="w-3.5 h-3.5" />
      </Btn>
      <Btn label="Redo" onClick={run((c) => c.redo())} disabled={!editor || editor.isDestroyed || !editor.can().redo()}>
        <Redo2 className="w-3.5 h-3.5" />
      </Btn>
    </div>
  );
};

export default NotebookToolbar;