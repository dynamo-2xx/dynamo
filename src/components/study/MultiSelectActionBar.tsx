import { Trash2, FolderInput } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { StudyFolder } from "@/hooks/useMyStudy";

interface Props {
  count: number;
  folders: StudyFolder[];
  onMove: (folderId: string | null) => void;
  onDelete: () => void;
  onCancel: () => void;
}

const MultiSelectActionBar = ({ count, folders, onMove, onDelete, onCancel }: Props) => {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-foreground text-background rounded-full shadow-lg flex items-center gap-1 px-3 py-2 text-xs font-body">
      <span className="px-2">{count} selected</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full hover:bg-background/10 transition-colors"
          >
            <FolderInput className="w-3.5 h-3.5" /> Move to folder
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-48">
          <DropdownMenuItem onClick={() => onMove(null)}>Uncategorized</DropdownMenuItem>
          {folders.length > 0 && <DropdownMenuSeparator />}
          {folders.map((f) => (
            <DropdownMenuItem key={f.id} onClick={() => onMove(f.id)}>
              {f.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center gap-1 px-3 py-1 rounded-full hover:bg-background/10 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" /> Delete
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-3 py-1 rounded-full hover:bg-background/10 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
};

export default MultiSelectActionBar;