import { Link } from "react-router-dom";
import { useState } from "react";
import { MoreVertical, Link2, Check } from "lucide-react";
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
import { monoGradientFromSeed } from "@/lib/gradient";
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
  draggable?: boolean;
}

const NotebookHeroCard = ({
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
        "group relative",
        sortable.isDragging && "opacity-50",
      )}
      {...(draggable && !selectMode ? sortable.attributes : {})}
      {...(draggable && !selectMode ? sortable.listeners : {})}
    >
      <Link
        to={`/my-study/${notebook.id}`}
        onClick={handleCardClick}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        onTouchMove={handleLongPressEnd}
        className="block"
      >
        {/* Book cover */}
        <div
          className={cn(
            "relative aspect-[3/4] rounded-lg border overflow-hidden shadow-sm group-hover:shadow-md transition-all",
            selected ? "border-foreground ring-1 ring-foreground/30" : "border-border hover:border-foreground/30",
          )}
          style={{ backgroundImage: monoGradientFromSeed(notebook.id || title) }}
        >
          {/* Top-left: select check OR share icon */}
          {selectMode ? (
            <span
              className={cn(
                "absolute top-2 left-2 z-10 w-6 h-6 rounded-full border flex items-center justify-center transition-colors",
                selected
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background/90 text-transparent border-border",
              )}
            >
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
            </span>
          ) : (
            notebook.share_token && (
              <span className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-background/85 backdrop-blur border border-border flex items-center justify-center text-muted-foreground">
                <Link2 className="w-3 h-3" />
              </span>
            )
          )}

          {/* Top-right: status pills */}
          <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-body",
                notebook.published
                  ? "bg-foreground text-background"
                  : "bg-background/80 backdrop-blur border border-border text-muted-foreground",
              )}
            >
              {notebook.published ? "Published" : "Draft"}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-body bg-background/80 backdrop-blur border border-border text-muted-foreground">
              {formatChip}
            </span>
          </div>

          {/* Title + meta over scrim */}
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/65 via-black/25 to-transparent">
            <h4 className="font-display text-[15px] sm:text-base leading-tight text-white line-clamp-3">
              {title}
            </h4>
            {(date || notebook.annotation_count > 0) && (
              <p className="text-[10px] text-white/70 font-body mt-1 truncate">
                {date}
                {notebook.annotation_count > 0 && <> · {notebook.annotation_count} annotations</>}
              </p>
            )}
          </div>
        </div>

        {/* Below cover: My Thoughts preview */}
        <div className="mt-2 px-0.5">
          <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-body mb-0.5">
            My Thoughts
          </p>
          <p
            className={cn(
              "text-[11px] font-body line-clamp-2",
              preview ? "text-foreground/80" : "italic text-muted-foreground",
            )}
          >
            {preview || "No content yet"}
          </p>
        </div>
      </Link>

      {/* Action menu, sibling of Link */}
      {!selectMode && (
        <div className="absolute top-1.5 right-1.5 z-20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="More actions"
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity w-7 h-7 rounded-full bg-background/90 backdrop-blur border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 z-50">
              {isTrashed ? (
                <>
                  <DropdownMenuItem onClick={() => onRestore?.(notebook.id)}>Restore</DropdownMenuItem>
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
  );
};

export default NotebookHeroCard;