import { useState } from "react";
import { ChevronRight, ChevronDown, MoreVertical, FolderOpen } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { StudyFolder } from "@/hooks/useMyStudy";
import { cn } from "@/lib/utils";

interface Props {
  folder: StudyFolder | null; // null = root / Uncategorized
  count: number;
  defaultOpen?: boolean;
  onRename?: (folder: StudyFolder) => void;
  onDelete?: (folder: StudyFolder) => void;
  children: React.ReactNode;
}

const FolderRow = ({ folder, count, defaultOpen = true, onRename, onDelete, children }: Props) => {
  const [open, setOpen] = useState(defaultOpen);
  const droppable = useDroppable({ id: folder ? `folder-${folder.id}` : "folder-root" });

  return (
    <section
      ref={droppable.setNodeRef}
      className={cn(
        "rounded-lg transition-colors",
        droppable.isOver && "bg-accent",
      )}
    >
      <header className="flex items-center gap-2 py-2 px-2 group">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-left flex-1 hover:opacity-80 transition-opacity"
        >
          {open ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          {folder ? (
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
          ) : null}
          <h3 className="font-display text-base sm:text-lg">
            {folder ? folder.name : "Uncategorized"}
          </h3>
          <span className="text-xs text-muted-foreground font-body">({count})</span>
        </button>
        {folder && (onRename || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground rounded"
                aria-label="Folder actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {onRename && <DropdownMenuItem onClick={() => onRename(folder)}>Rename</DropdownMenuItem>}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(folder)}
                  className="text-destructive focus:text-destructive"
                >
                  Delete folder
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>
      {open && (
        <div className="space-y-2 pl-2 pr-2 pb-2">
          {count === 0 ? (
            <p className="text-xs italic text-muted-foreground py-2 px-2">
              {folder ? "Drag notebooks here." : "No notebooks here."}
            </p>
          ) : (
            children
          )}
        </div>
      )}
    </section>
  );
};

export default FolderRow;