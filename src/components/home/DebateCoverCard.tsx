import { Link } from "react-router-dom";
import { useState } from "react";
import { Users, MoreHorizontal, Globe, Lock, Archive, Trash2, Check, HandHeart, Calendar, FileText } from "lucide-react";
import { gradientFromSeed } from "@/lib/gradient";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatUpcomingShort } from "@/lib/date";
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
  scheduled_at?: string | null;
  created_by?: string;
  is_public?: boolean;
  kind?: "debate" | "live_session" | "imported_record";
  format?: string | null;
}

interface Props {
  d: DebateCoverItem;
  onChanged?: (action: "removed" | "updated", id: string, patch?: Partial<DebateCoverItem>) => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelected?: (id: string) => void;
}

const PILL_BASE =
  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-body font-medium uppercase tracking-wider border border-border";

const DebateCoverCard = ({ d, onChanged, selectionMode, selected, onToggleSelected }: Props) => {
  const { user } = useAuth();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const isLiveSession = d.kind === "live_session";
  const isImported = d.kind === "imported_record";
  const isLive = d.status === "live";
  const isScheduled = d.status === "scheduled" || d.status === "draft";
  const isArchived = d.status === "archived";
  const isOwner = !!user && !!d.created_by && user.id === d.created_by;
  const showOwnerControls = isOwner && !isLive && !selectionMode && !isLiveSession && !isImported;
  const selectable = !!selectionMode && isOwner;
  const happeningLabel = isScheduled && !isLiveSession ? formatUpcomingShort(d.scheduled_at) : null;
  const linkTo = isImported
    ? `/import/${d.id}`
    : isLiveSession
      ? `/live/${d.id}`
      : isScheduled
        ? `/debate/${d.id}/preview`
        : `/debate/${d.id}`;

  const bg = d.cover_image_url
    ? { backgroundImage: `url(${d.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundImage: gradientFromSeed(d.topic) };

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
    toast({ title: "Archived", description: "Find it in My Agenda → Archive" });
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

  const renderStatusPill = () => {
    if (isImported) {
      return (
        <span className={cn(PILL_BASE, "bg-background/95 text-foreground")}>
          <FileText className="w-2.5 h-2.5" />
          Imported
        </span>
      );
    }
    if (isLiveSession) {
      const isRec = d.status === "live";
      return (
        <span className={cn(PILL_BASE, "bg-background/95 text-foreground")}>
          {isRec ? (
            <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
          ) : null}
          {isRec ? "Live · Recording" : "Live · Recorded"}
        </span>
      );
    }
    if (isLive) {
      return (
        <span className={cn(PILL_BASE, "bg-background/95 text-foreground")}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
          Live
        </span>
      );
    }
    if (isArchived) {
      return (
        <span className={cn(PILL_BASE, "bg-background/95 text-foreground border-dashed")}>
          <Archive className="w-2.5 h-2.5" />
          Archived
        </span>
      );
    }
    // Scheduled / draft debates: if creator set a scheduled_at, show the date pill;
    // otherwise prompt non-owners with INTERESTED?
    if (isScheduled) {
      if (happeningLabel) {
        return (
          <span className={cn(PILL_BASE, "bg-background/95 text-foreground")}>
            <Calendar className="w-2.5 h-2.5" />
            Happening {happeningLabel}
          </span>
        );
      }
      if (!isOwner) {
        return (
          <span className={cn(PILL_BASE, "bg-foreground text-background border-foreground")}>
            <HandHeart className="w-2.5 h-2.5" />
            Interested?
          </span>
        );
      }
      // Owner without a scheduled time keeps privacy pill (falls through below)
    }
    if (isOwner) {
      return d.is_public ? (
        <span className={cn(PILL_BASE, "bg-background/95 text-foreground")}>
          <Globe className="w-2.5 h-2.5" />
          Public
        </span>
      ) : (
        <span className={cn(PILL_BASE, "bg-background/90 text-muted-foreground")}>
          <Lock className="w-2.5 h-2.5" />
          Private
        </span>
      );
    }
    return (
      <span className={cn(PILL_BASE, "bg-background/90 text-muted-foreground")}>
        {d.status}
      </span>
    );
  };

  const cardInner = (
    <>
      {/* Bottom gradient for legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Top-left: status pill OR selection checkbox */}
      <div className="absolute top-3 left-3">
        {selectable ? (
          <span
            className={cn(
              "w-6 h-6 rounded-full border flex items-center justify-center transition-colors",
              selected
                ? "bg-foreground text-background border-foreground"
                : "bg-background/95 text-transparent border-border",
            )}
          >
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
          </span>
        ) : (
          renderStatusPill()
        )}
      </div>

      {/* Participant count — moves to bottom-right on small cards to avoid colliding with ⋯ */}
      {typeof d.participant_count === "number" && d.participant_count > 0 && (
        <div
          className={cn(
            "absolute z-10",
            showOwnerControls
              ? "bottom-3 right-3 sm:top-3 sm:bottom-auto sm:right-14"
              : "top-3 right-3",
          )}
        >
          <span className={cn(PILL_BASE, "bg-background/90 text-foreground normal-case tracking-normal")}>
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
    </>
  );

  const cardClasses = cn(
    "relative block w-full aspect-[16/10] rounded-xl overflow-hidden border transition-colors",
    selected ? "border-foreground ring-2 ring-foreground" : "border-border hover:border-foreground/30",
  );

  return (
    <div className="relative">
      {selectionMode ? (
        <button
          type="button"
          onClick={() => selectable && onToggleSelected?.(d.id)}
          disabled={!selectable}
          className={cn(cardClasses, "text-left", !selectable && "opacity-60 cursor-not-allowed")}
          style={bg}
          aria-pressed={selected}
        >
          {cardInner}
        </button>
      ) : (
        <Link to={linkTo} className={cardClasses} style={bg}>
          {cardInner}
        </Link>
      )}

      {/* Owner action menu — sibling of <Link>, absolutely positioned with high z-index */}
      {showOwnerControls && (
        <div
          className="absolute top-2 right-2 z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                aria-label="More actions"
                className="w-9 h-9 sm:w-7 sm:h-7 rounded-full bg-background/95 hover:bg-background text-foreground flex items-center justify-center transition-colors shadow-sm border border-border"
              >
                <MoreHorizontal className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 z-50">
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

      {/* Interested? CTA moved to /debate/:id/preview page */}


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
