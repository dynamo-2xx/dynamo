import { Link } from "react-router-dom";
import { useState } from "react";
import { Users, MoreHorizontal, Globe, Lock, Archive, Trash2 } from "lucide-react";
import { gradientFromSeed } from "@/lib/gradient";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface DebateCoverItem {
  id: string;
  topic: string;
  status: string;
  cover_image_url?: string | null;
  participant_count?: number;
  created_at?: string;
  created_by?: string;
  is_public?: boolean;
}

interface Props {
  d: DebateCoverItem;
  onChanged?: (action: "removed" | "updated", id: string, patch?: Partial<DebateCoverItem>) => void;
}

const DebateCoverCard = ({ d, onChanged }: Props) => {
  const { user } = useAuth();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const isLive = d.status === "live";
  const isOwner = !!user && !!d.created_by && user.id === d.created_by;
  const showOwnerControls = isOwner && !isLive;

  const bg = d.cover_image_url
    ? { backgroundImage: `url(${d.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundImage: gradientFromSeed(d.topic) };

  const stop = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const togglePrivacy = async () => {
    if (busy) return;
    setBusy(true);
    const next = !d.is_public;
    const { error } = await supabase.from("debates").update({ is_public: next }).eq("id", d.id);
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: next ? "Now public" : "Now private" });
    onChanged?.("updated", d.id, { is_public: next });
  };

  const archive = async () => {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.from("debates").update({ status: "archived" }).eq("id", d.id);
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't archive", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Archived" });
    onChanged?.("removed", d.id);
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.from("debates").delete().eq("id", d.id);
    setBusy(false);
    setConfirmDeleteOpen(false);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Debate deleted" });
    onChanged?.("removed", d.id);
  };

  return (
    <div className="relative group">
      <Link
        to={`/debate/${d.id}`}
        className="relative block w-full aspect-[16/10] rounded-xl overflow-hidden border border-border hover:border-foreground/30 transition-colors"
        style={bg}
      >
        {/* Bottom gradient for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Top-left status pill */}
        <div className="absolute top-3 left-3">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-body font-medium uppercase tracking-wider bg-white/90 text-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
              Live
            </span>
          ) : showOwnerControls ? (
            d.is_public ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-body font-medium uppercase tracking-wider bg-white/90 text-foreground">
                <Globe className="w-2.5 h-2.5" />
                Public
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-body font-medium uppercase tracking-wider bg-white/85 text-muted-foreground">
                <Lock className="w-2.5 h-2.5" />
                Private
              </span>
            )
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-body font-medium uppercase tracking-wider bg-white/80 text-muted-foreground">
              {d.status}
            </span>
          )}
        </div>

        {/* Participant count (left of menu) */}
        {typeof d.participant_count === "number" && d.participant_count > 0 && (
          <div
            className={`absolute top-3 ${showOwnerControls ? "right-12" : "right-3"}`}
          >
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-body bg-white/85 text-foreground">
              <Users className="w-3 h-3" />
              {d.participant_count}
            </span>
          </div>
        )}

        {/* Bottom topic */}
        <div className="absolute bottom-3 left-3 right-3">
          <h4 className="font-display text-white text-base leading-snug line-clamp-2 drop-shadow">
            {d.topic}
          </h4>
        </div>
      </Link>

      {/* Owner action menu — sibling of <Link>, not a child, so clicks don't navigate */}
      {showOwnerControls && (
        <div className="absolute top-3 right-3 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={stop}
                onPointerDown={stop}
                aria-label="More actions"
                className="w-7 h-7 rounded-full bg-white/95 hover:bg-white text-foreground flex items-center justify-center transition-colors shadow-sm"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  togglePrivacy();
                }}
              >
                {d.is_public ? (
                  <>
                    <Lock className="w-4 h-4 mr-2" /> Make Private
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 mr-2" /> Make Public
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  archive();
                }}
              >
                <Archive className="w-4 h-4 mr-2" /> Archive
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setConfirmDeleteOpen(true);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this debate?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the debate, its transcript, and any participant grades. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                remove();
              }}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DebateCoverCard;
