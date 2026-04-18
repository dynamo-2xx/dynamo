import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import DebateCoverCard, { type DebateCoverItem } from "@/components/home/DebateCoverCard";
import SwipeableDebateCard from "@/components/home/SwipeableDebateCard";
import BulkActionBar from "@/components/home/BulkActionBar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
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

const MyDebatesPage = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab =
    tabParam === "archive" || tabParam === "drafts"
      ? "archive"
      : tabParam === "live"
      ? "live"
      : "debates";

  const [debates, setDebates] = useState<DebateCoverItem[]>([]);
  const [archive, setArchive] = useState<DebateCoverItem[]>([]);
  const [liveSessions, setLiveSessions] = useState<DebateCoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<DebateCoverItem | null>(null);
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [closeSignal, setCloseSignal] = useState(0);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Active debates I created (not draft, not archived)
      const { data: created } = await supabase
        .from("debates")
        .select("id, topic, status, cover_image_url, created_at, is_public, created_by, debate_participants(count)")
        .eq("created_by", user.id)
        .not("status", "in", "(draft,archived)")
        .order("created_at", { ascending: false });

      const { data: participated } = await supabase
        .from("debate_participants")
        .select("debate_id")
        .eq("user_id", user.id);

      const participatedIds = (participated || []).map((p) => p.debate_id);
      const createdIds = new Set((created || []).map((d) => d.id));
      const extraIds = participatedIds.filter((id) => !createdIds.has(id));

      let extraDebates: any[] = [];
      if (extraIds.length > 0) {
        const { data } = await supabase
          .from("debates")
          .select("id, topic, status, cover_image_url, created_at, is_public, created_by, debate_participants(count)")
          .in("id", extraIds)
          .not("status", "in", "(draft,archived)")
          .order("created_at", { ascending: false });
        extraDebates = data || [];
      }

      const all = [...(created || []), ...extraDebates];
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setDebates(
        all.map((d: any) => ({
          kind: "debate",
          id: d.id,
          topic: d.topic,
          status: d.status,
          cover_image_url: d.cover_image_url,
          created_at: d.created_at,
          is_public: d.is_public,
          created_by: d.created_by,
          participant_count: d.debate_participants?.[0]?.count ?? 0,
        })),
      );

      // Archive (drafts + archived) I created
      const { data: myArchive } = await supabase
        .from("debates")
        .select("id, topic, status, cover_image_url, created_at, is_public, created_by, debate_participants(count)")
        .eq("created_by", user.id)
        .in("status", ["draft", "archived"])
        .order("created_at", { ascending: false });

      setArchive(
        ((myArchive || []) as any[]).map((d) => ({
          kind: "debate",
          id: d.id,
          topic: d.topic,
          status: d.status,
          cover_image_url: d.cover_image_url,
          created_at: d.created_at,
          is_public: d.is_public,
          created_by: d.created_by,
          participant_count: d.debate_participants?.[0]?.count ?? 0,
        })),
      );

      // Live sessions
      const { data: sessions } = await supabase
        .from("live_sessions" as any)
        .select("id, title, status, created_at, created_by")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      setLiveSessions(
        (((sessions as any) || []) as any[]).map((s) => ({
          kind: "live_session",
          id: s.id,
          topic: s.title || "Untitled Live Session",
          status: s.status === "recording" ? "live" : "completed",
          cover_image_url: null,
          created_at: s.created_at,
          is_public: true,
          created_by: s.created_by,
          participant_count: 0,
        })),
      );

      setLoading(false);
    };
    load();
  }, [user]);

  const removeFromList = (id: string) => {
    setDebates((prev) => prev.filter((d) => d.id !== id));
    setArchive((prev) => prev.filter((d) => d.id !== id));
    setLiveSessions((prev) => prev.filter((d) => d.id !== id));
  };

  const patchInList = (id: string, patch: Partial<DebateCoverItem>) => {
    const upd = (arr: DebateCoverItem[]) =>
      arr.map((d) => (d.id === id ? { ...d, ...patch } : d));
    setDebates(upd);
    setArchive(upd);
    setLiveSessions(upd);
  };

  const swipeTogglePrivacy = async (item: DebateCoverItem) => {
    if (item.kind === "live_session") return;
    const next = !item.is_public;
    const { error } = await supabase.from("debates").update({ is_public: next }).eq("id", item.id);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    patchInList(item.id, { is_public: next });
    toast({ title: next ? "Now public" : "Now private" });
  };

  const swipeArchive = async (item: DebateCoverItem) => {
    if (item.kind === "live_session") return;
    const { error } = await supabase.from("debates").update({ status: "archived" }).eq("id", item.id);
    if (error) {
      toast({ title: "Couldn't archive", description: error.message, variant: "destructive" });
      return;
    }
    // Move from active to archive list
    setDebates((prev) => prev.filter((d) => d.id !== item.id));
    setArchive((prev) => [{ ...item, status: "archived" }, ...prev]);
    toast({ title: "Archived" });
  };

  const swipeDelete = async () => {
    const item = confirmDelete;
    if (!item) return;
    const table = item.kind === "live_session" ? ("live_sessions" as any) : "debates";
    const { error } = await supabase.from(table).delete().eq("id", item.id);
    setConfirmDelete(null);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      return;
    }
    removeFromList(item.id);
    toast({ title: "Deleted" });
  };

  const closeAllSwipes = () => {
    setOpenSwipeId(null);
    setCloseSignal((n) => n + 1);
  };

  const currentList =
    activeTab === "archive" ? archive : activeTab === "live" ? liveSessions : debates;
  const emptyMessage =
    activeTab === "archive"
      ? "Nothing in your archive yet. Drafts and archived debates appear here."
      : activeTab === "live"
      ? "You have no live session records yet."
      : "You haven't participated in any debates yet.";

  const ownedSelectedItems = () =>
    Array.from(selected)
      .map((id) => currentList.find((x) => x.id === id))
      .filter((x): x is DebateCoverItem => !!x && !!user && x.created_by === user.id);

  const exitSelection = () => {
    setSelectionMode(false);
    setSelected(new Set());
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectableIdsInView = () =>
    currentList.filter((d) => user && d.created_by === user.id).map((d) => d.id);

  const allSelected = (() => {
    const ids = selectableIdsInView();
    return ids.length > 0 && ids.every((id) => selected.has(id));
  })();

  const bulkPrivacy = async (next: boolean) => {
    const items = ownedSelectedItems().filter((i) => i.kind !== "live_session");
    if (items.length === 0) return;
    setBusy(true);
    const { error } = await supabase
      .from("debates")
      .update({ is_public: next })
      .in("id", items.map((i) => i.id));
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    items.forEach((i) => patchInList(i.id, { is_public: next }));
    toast({ title: `${items.length} updated`, description: next ? "Now public" : "Now private" });
    exitSelection();
  };

  const bulkArchive = async () => {
    const items = ownedSelectedItems().filter((i) => i.kind !== "live_session");
    if (items.length === 0) return;
    setBusy(true);
    const { error } = await supabase
      .from("debates")
      .update({ status: "archived" })
      .in("id", items.map((i) => i.id));
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't archive", description: error.message, variant: "destructive" });
      return;
    }
    items.forEach((i) => {
      setDebates((prev) => prev.filter((d) => d.id !== i.id));
      setArchive((prev) => [{ ...i, status: "archived" }, ...prev.filter((d) => d.id !== i.id)]);
    });
    toast({ title: `${items.length} archived` });
    exitSelection();
  };

  const bulkDelete = async () => {
    const items = ownedSelectedItems();
    if (items.length === 0) {
      setConfirmBulkDeleteOpen(false);
      return;
    }
    setBusy(true);
    const debateIds = items.filter((i) => i.kind !== "live_session").map((i) => i.id);
    const liveIds = items.filter((i) => i.kind === "live_session").map((i) => i.id);
    const errors: string[] = [];
    if (debateIds.length > 0) {
      const { error } = await supabase.from("debates").delete().in("id", debateIds);
      if (error) errors.push(error.message);
    }
    if (liveIds.length > 0) {
      const { error } = await supabase.from("live_sessions" as any).delete().in("id", liveIds);
      if (error) errors.push(error.message);
    }
    setBusy(false);
    setConfirmBulkDeleteOpen(false);
    if (errors.length > 0) {
      toast({ title: "Some deletions failed", description: errors.join("; "), variant: "destructive" });
    }
    items.forEach((i) => removeFromList(i.id));
    toast({ title: `${items.length} deleted` });
    exitSelection();
  };


  return (
    <AppLayout>
      <div
        className="max-w-5xl mx-auto px-4 py-6 sm:py-8 md:py-12"
        onClick={() => {
          if (openSwipeId) closeAllSwipes();
        }}
      >
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] inline-flex items-center justify-center -ml-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h2 className="text-2xl sm:text-3xl font-display font-bold">My Agenda</h2>
            </div>
            {currentList.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                {selectionMode && (
                  <button
                    onClick={() => {
                      const ids = selectableIdsInView();
                      setSelected(allSelected ? new Set() : new Set(ids));
                    }}
                    className="text-xs font-body px-3 py-2 rounded-full border border-border hover:border-foreground/40 transition-colors min-h-[36px]"
                  >
                    {allSelected ? "Deselect all" : "Select all"}
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

          {/* Tabs */}
          <div className="flex gap-1 bg-secondary/50 rounded-lg p-1 mb-6">
            <button
              onClick={() => setSearchParams({})}
              className={cn(
                "flex-1 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors min-h-[40px]",
                activeTab === "debates"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Debates
            </button>
            <button
              onClick={() => setSearchParams({ tab: "archive" })}
              className={cn(
                "flex-1 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors min-h-[40px]",
                activeTab === "archive"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Archive
            </button>
            <button
              onClick={() => setSearchParams({ tab: "live" })}
              className={cn(
                "flex-1 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors min-h-[40px]",
                activeTab === "live"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Live
            </button>
          </div>

          {isMobile && currentList.length > 0 && (
            <p className="text-[11px] text-muted-foreground font-body mb-3 text-center">
              Tip: swipe a card left for Archive/Delete, right for Public/Private.
            </p>
          )}

          {loading ? (
            <p className="text-muted-foreground text-center py-12 animate-pulse">Loading…</p>
          ) : currentList.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">{emptyMessage}</p>
          ) : (
            <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", selectionMode && "pb-44 md:pb-32")}>
              {currentList.map((d) => {
                const isOwner = !!user && d.created_by === user.id;
                const card = (
                  <DebateCoverCard
                    d={d}
                    selectionMode={selectionMode}
                    selected={selected.has(d.id)}
                    onToggleSelected={toggle}
                    onChanged={(action, id, patch) => {
                      if (action === "removed") removeFromList(id);
                      else if (action === "updated" && patch) patchInList(id, patch);
                    }}
                  />
                );

                if (!isMobile || !isOwner || selectionMode) {
                  return <div key={`${d.kind || "debate"}-${d.id}`}>{card}</div>;
                }

                return (
                  <SwipeableDebateCard
                    key={`${d.kind || "debate"}-${d.id}`}
                    enabled
                    isPublic={!!d.is_public}
                    forceClose={closeSignal}
                    onOpen={() => {
                      if (openSwipeId && openSwipeId !== d.id) closeAllSwipes();
                      setOpenSwipeId(d.id);
                    }}
                    onTogglePrivacy={() => swipeTogglePrivacy(d)}
                    onArchive={() => swipeArchive(d)}
                    onDelete={() => setConfirmDelete(d)}
                  >
                    {card}
                  </SwipeableDebateCard>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete this {confirmDelete?.kind === "live_session" ? "live session" : confirmDelete?.status === "draft" ? "draft" : "debate"}?
            </AlertDialogTitle>
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

export default MyDebatesPage;
