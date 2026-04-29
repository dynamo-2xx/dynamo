import { Link } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useMyRecentDebates } from "@/hooks/useHomeDebates";
import DebateCoverCard, { type DebateCoverItem } from "@/components/home/DebateCoverCard";
import SwipeableDebateCard from "@/components/home/SwipeableDebateCard";
import BulkActionBar from "@/components/home/BulkActionBar";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDeleteAnimation } from "@/hooks/useDeleteAnimation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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

const INITIAL_VISIBLE = 12;

const MyRecentPage = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { items, loading, removeItem, patchItem } = useMyRecentDebates(60);
  const { isRemoving, animateRemove } = useDeleteAnimation();
  const [showAll, setShowAll] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmSingleDeleteOpen, setConfirmSingleDeleteOpen] = useState<DebateCoverItem | null>(null);
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [closeSignal, setCloseSignal] = useState(0);

  const visible = showAll ? items : items.slice(0, INITIAL_VISIBLE);
  const hasMore = items.length > INITIAL_VISIBLE;

  const ownedSelectedIds = () => {
    return Array.from(selected).filter((id) => {
      const it = items.find((x) => x.id === id);
      return it && user && it.created_by === user.id && it.kind !== "live_session";
    });
  };

  const exitSelection = () => {
    setSelectionMode(false);
    setSelected(new Set());
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkPrivacy = async (next: boolean) => {
    const ids = ownedSelectedIds();
    if (ids.length === 0) return;
    setBusy(true);
    const { error } = await supabase.from("debates").update({ is_public: next }).in("id", ids);
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    ids.forEach((id) => patchItem(id, { is_public: next }));
    toast({ title: `${ids.length} updated`, description: next ? "Now public" : "Now private" });
    exitSelection();
  };

  const bulkArchive = async () => {
    const ids = ownedSelectedIds();
    if (ids.length === 0) return;
    setBusy(true);
    const { error } = await supabase.from("debates").update({ status: "archived" }).in("id", ids);
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't archive", description: error.message, variant: "destructive" });
      return;
    }
    animateRemove(ids, removeItem);
    toast({ title: `${ids.length} archived`, description: "Find them in My Agenda → Archive" });
    exitSelection();
  };

  const bulkDelete = async () => {
    const ids = ownedSelectedIds();
    if (ids.length === 0) {
      setConfirmDeleteOpen(false);
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("debates").delete().in("id", ids);
    setBusy(false);
    setConfirmDeleteOpen(false);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      return;
    }
    animateRemove(ids, removeItem);
    toast({ title: `${ids.length} deleted` });
    exitSelection();
  };

  // Single-card swipe actions
  const swipeTogglePrivacy = async (item: DebateCoverItem) => {
    if (!item || item.kind === "live_session") return;
    const next = !item.is_public;
    const { error } = await supabase.from("debates").update({ is_public: next }).eq("id", item.id);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    patchItem(item.id, { is_public: next });
    toast({ title: next ? "Now public" : "Now private" });
  };

  const swipeArchive = async (item: DebateCoverItem) => {
    if (!item || item.kind === "live_session") return;
    const { error } = await supabase.from("debates").update({ status: "archived" }).eq("id", item.id);
    if (error) {
      toast({ title: "Couldn't archive", description: error.message, variant: "destructive" });
      return;
    }
    animateRemove(item.id, removeItem);
    toast({ title: "Archived" });
  };

  const swipeDelete = async () => {
    const item = confirmSingleDeleteOpen;
    if (!item) return;
    const table = item.kind === "live_session" ? ("live_sessions" as any) : "debates";
    const { error } = await supabase.from(table).delete().eq("id", item.id);
    setConfirmSingleDeleteOpen(null);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      return;
    }
    animateRemove(item.id, removeItem);
    toast({ title: "Deleted" });
  };

  const closeAllSwipes = () => {
    setOpenSwipeId(null);
    setCloseSignal((n) => n + 1);
  };

  return (
    <AppLayout>
      <div
        className={cn(
          "max-w-5xl mx-auto px-4 py-6 md:py-10",
          selectionMode ? "pb-44 md:pb-32" : "pb-8 md:pb-12",
        )}
        onClick={() => {
          if (openSwipeId) closeAllSwipes();
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-body min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </Link>
          <Link
            to="/my-debates"
            className="text-sm font-body text-foreground hover:underline min-h-[44px] inline-flex items-center"
          >
            My Agenda →
          </Link>
        </div>

        <div className="flex items-end justify-between mb-5 gap-3 flex-wrap">
          <h1 className="text-[22px] sm:text-[24px] font-display">My Recent</h1>
          {items.length > 0 && (
            <div className="flex items-center gap-2">
              {selectionMode && (
                <button
                  onClick={() => {
                    const allIds = visible
                      .filter((d) => user && d.created_by === user.id && d.kind !== "live_session")
                      .map((d) => d.id);
                    const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
                    setSelected(allSelected ? new Set() : new Set(allIds));
                  }}
                  className="text-xs font-body px-3 py-2 rounded-full border border-border hover:border-foreground/40 transition-colors min-h-[36px]"
                >
                  {(() => {
                    const ids = visible
                      .filter((d) => user && d.created_by === user.id && d.kind !== "live_session")
                      .map((d) => d.id);
                    return ids.length > 0 && ids.every((id) => selected.has(id))
                      ? "Deselect all"
                      : "Select all";
                  })()}
                </button>
              )}
              <button
                onClick={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
                className="text-xs font-body px-3 py-2 rounded-full border border-border hover:border-foreground/40 transition-colors min-h-[36px]"
              >
                {selectionMode ? "Done" : "Select"}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm font-body">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm font-body py-12 text-center">
            You haven't joined or created any debates yet.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map((d) => {
                const isOwner = !!user && d.created_by === user.id;
                const removing = isRemoving(d.id);
                const card = (
                  <DebateCoverCard
                    d={d}
                    selectionMode={selectionMode}
                    selected={selected.has(d.id)}
                    onToggleSelected={toggle}
                    onChanged={(action, id, patch) => {
                      if (action === "removed") animateRemove(id, removeItem);
                      else if (action === "updated" && patch) patchItem(id, patch);
                    }}
                  />
                );

                if (!isMobile || selectionMode || !isOwner) {
                  return (
                    <div
                      key={`${d.kind || "debate"}-${d.id}`}
                      className={removing ? "deleting-item" : undefined}
                    >
                      {card}
                    </div>
                  );
                }

                return (
                  <div
                    key={`${d.kind || "debate"}-${d.id}`}
                    className={removing ? "deleting-item" : undefined}
                  >
                  <SwipeableDebateCard
                    enabled
                    isPublic={!!d.is_public}
                    busy={busy}
                    forceClose={closeSignal}
                    onOpen={() => {
                      if (openSwipeId && openSwipeId !== d.id) closeAllSwipes();
                      setOpenSwipeId(d.id);
                    }}
                    onTogglePrivacy={() => swipeTogglePrivacy(d)}
                    onArchive={() => swipeArchive(d)}
                    onDelete={() => setConfirmSingleDeleteOpen(d)}
                  >
                    {card}
                  </SwipeableDebateCard>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-center">
              {hasMore && !showAll ? (
                <button
                  onClick={() => setShowAll(true)}
                  className="text-sm font-body px-5 py-2.5 rounded-full border border-border hover:border-foreground/40 transition-colors min-h-[44px]"
                >
                  See all ({items.length})
                </button>
              ) : (
                <span className="text-xs text-muted-foreground font-body">
                  Showing {visible.length} of {items.length}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {selectionMode && (
        <BulkActionBar
          count={selected.size}
          busy={busy}
          onCancel={exitSelection}
          onMakePublic={() => bulkPrivacy(true)}
          onMakePrivate={() => bulkPrivacy(false)}
          onArchive={bulkArchive}
          onDelete={() => setConfirmDeleteOpen(true)}
        />
      )}

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {ownedSelectedIds().length} debates?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the selected debates, their transcripts, and any participant grades. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                bulkDelete();
              }}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmSingleDeleteOpen}
        onOpenChange={(open) => !open && setConfirmSingleDeleteOpen(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {confirmSingleDeleteOpen?.kind === "live_session" ? "live session" : "debate"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes it and any related transcripts. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                swipeDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default MyRecentPage;
