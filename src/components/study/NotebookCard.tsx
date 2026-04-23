import { Link } from "react-router-dom";
import { useState } from "react";
import { MoreVertical, GripVertical, Link2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  StudyNotebook,
  StudyFolder,
  notebookPreview,
  notebookTitle,
} from "@/hooks/useMyStudy";
import { cn } from "@/lib/utils";

interface Props {
  notebook: StudyNotebook;
  folders: StudyFolder[];
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: (id: string, e?: React.MouseEvent) => void;
  onRename: (id: string) => void;
  onMoveToFolder: (id: string, folderId: string | null) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore?: (id: string) => void;
  onHardDelete?: (id: string) => void;
  isTrashed?: boolean;
  variant?: "full" | "compact";
  draggable?: boolean;
}

const NotebookCard = ({
  notebook,
  folders,
  selectMode,
  selected,
  onToggleSelect,
  onRename,
  onMoveToFolder,
  onShare,
  onDelete,
  onRestore,
  onHardDelete,
  isTrashed,
  variant = "full",
  draggable = true,
}: Props) => {
  const sortable = useSortable({ id: notebook.id, disabled: !draggable || selectMode });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const title = notebookTitle(notebook);
  const preview = notebookPreview(notebook);
  const formatChip =
    notebook.record_type === "debate"
      ? "Debate"
      : notebook.record_type === "change_my_mind"
        ? "CMM"
        : "Live";
  const recordHref =
    notebook.record_type === "debate"
      ? `/debate/${notebook.record_id}`
      : notebook.record_type === "change_my_mind"
        ? `/cmm/${notebook.record_id}`
        : `/live/${notebook.record_id || notebook.session_id}`;
  const date = notebook.session_created_at
    ? new Date(notebook.session_created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "";
  const duration =
    notebook.session_created_at && notebook.session_ended_at
      ? `${Math.max(
          1,
          Math.round(
            (new Date(notebook.session_ended_at).getTime() -
              new Date(notebook.session_created_at).getTime()) /
              60000,
          ),
        )} min`
      : null;

  const handleLongPressStart = () => {
    if (selectMode) return;
    const t = setTimeout(() => onToggleSelect(notebook.id), 500);
    setLongPressTimer(t);
  };
  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (selectMode) {
      e.preventDefault();
      onToggleSelect(notebook.id, e);
    }
  };

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={cn(
        "group relative border rounded-lg bg-background transition-colors",
        "border-border hover:border-foreground/20",
        selected && "border-foreground ring-1 ring-foreground/30",
        sortable.isDragging && "opacity-50",
      )}
    >
      <Link
        to={`/my-study/${notebook.id}`}
        onClick={handleCardClick}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        onTouchMove={handleLongPressEnd}
        className="block p-3 sm:p-4"
      >
        <div className="flex items-start gap-2">
          {selectMode && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(notebook.id)}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 shrink-0"
              aria-label="Select notebook"
            />
          )}
          {draggable && !selectMode && (
            <button
              type="button"
              {...sortable.attributes}
              {...sortable.listeners}
              onClick={(e) => e.preventDefault()}
              className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5"
              aria-label="Drag handle"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-display text-sm sm:text-base leading-tight truncate">{title}</h4>
              <div className="flex items-center gap-1.5 shrink-0">
                {notebook.share_token && (
                  <Link2 className="w-3 h-3 text-muted-foreground" aria-label="Shared" />
                )}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-body border border-border text-muted-foreground">
                  {formatChip}
                </span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-body",
                    notebook.published
                      ? "bg-foreground text-background"
                      : "border border-border text-muted-foreground",
                  )}
                >
                  {notebook.published ? "Published" : "Draft"}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground font-body mb-1">
              {date && <span>{date}</span>}
              {duration && <span> · {duration}</span>}
              {notebook.annotation_count > 0 && (
                <span> · {notebook.annotation_count} annotation{notebook.annotation_count === 1 ? "" : "s"}</span>
              )}
            </p>
            {variant === "full" && (
              <p
                className={cn(
                  "text-xs font-body line-clamp-2",
                  preview ? "text-foreground/80" : "italic text-muted-foreground",
                )}
              >
                {preview || "No content yet"}
              </p>
            )}
            {variant === "full" && notebook.tags.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {notebook.tags.slice(0, 3).map((t) => (
                  <span
                    key={t.id}
                    className="text-[10px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground"
                  >
                    #{t.name}
                  </span>
                ))}
                {notebook.tags.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{notebook.tags.length - 3}</span>
                )}
              </div>
            )}
          </div>
          {variant === "full" && !selectMode && (
            <div onClick={(e) => e.preventDefault()} className="shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 text-muted-foreground hover:text-foreground rounded"
                    aria-label="More actions"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {isTrashed ? (
                    <>
                      <DropdownMenuItem onClick={() => onRestore?.(notebook.id)}>
                        Restore
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onHardDelete?.(notebook.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        Delete forever
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to={`/my-study/${notebook.id}`}>Open</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={recordHref}>Open record</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onRename(notebook.id)}>Rename</DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Move to folder</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem onClick={() => onMoveToFolder(notebook.id, null)}>
                            Uncategorized
                          </DropdownMenuItem>
                          {folders.length > 0 && <DropdownMenuSeparator />}
                          {folders.map((f) => (
                            <DropdownMenuItem
                              key={f.id}
                              onClick={() => onMoveToFolder(notebook.id, f.id)}
                            >
                              {f.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuItem onClick={() => onShare(notebook.id)}>Share</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(notebook.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

export default NotebookCard;