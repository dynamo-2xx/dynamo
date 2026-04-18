import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useForYouDebates } from "@/hooks/useHomeDebates";
import { useAuth } from "@/contexts/AuthContext";
import DebateCoverCard from "@/components/home/DebateCoverCard";
import BulkActionBar from "@/components/home/BulkActionBar";
import AppLayout from "@/components/AppLayout";
import LocationPrompt from "@/components/home/LocationPrompt";
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

type Mode = "trending" | "local";

const INITIAL_VISIBLE = 12;

const ForYouPage = () => {
  const [mode, setMode] = useState<Mode>("trending");
  const [locationPromptOpen, setLocationPromptOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const { user, profile } = useAuth();
  const { items, loading, removeItem, patchItem } = useForYouDebates(mode, 60);
  const hasLocation = !!profile?.location;
  const visible = showAll ? items : items.slice(0, INITIAL_VISIBLE);
  const hasMore = items.length > INITIAL_VISIBLE;

  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const ownedSelectedIds = () =>
    Array.from(selected).filter((id) => {
      const it = items.find((x) => x.id === id);
      return it && user && it.created_by === user.id;
    });

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

  const reportSkipped = (acted: number, total: number) => {
    const skipped = total - acted;
    if (skipped > 0) toast({ title: `${skipped} skipped`, description: "You can only manage debates you created." });
  };

  const bulkPrivacy = async (next: boolean) => {
    const ids = ownedSelectedIds();
    if (ids.length === 0) {
      reportSkipped(0, selected.size);
      exitSelection();
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("debates").update({ is_public: next }).in("id", ids);
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    ids.forEach((id) => patchItem(id, { is_public: next }));
    toast({ title: `${ids.length} updated`, description: next ? "Now public" : "Now private" });
    reportSkipped(ids.length, selected.size);
    exitSelection();
  };

  const bulkArchive = async () => {
    const ids = ownedSelectedIds();
    if (ids.length === 0) {
      reportSkipped(0, selected.size);
      exitSelection();
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("debates").update({ status: "archived" }).in("id", ids);
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't archive", description: error.message, variant: "destructive" });
      return;
    }
    ids.forEach((id) => removeItem(id));
    toast({ title: `${ids.length} archived`, description: "Find them in My Agenda → Archive" });
    reportSkipped(ids.length, selected.size);
    exitSelection();
  };

  const bulkDelete = async () => {
    const ids = ownedSelectedIds();
    setConfirmDeleteOpen(false);
    if (ids.length === 0) {
      reportSkipped(0, selected.size);
      exitSelection();
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("debates").delete().in("id", ids);
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      return;
    }
    ids.forEach((id) => removeItem(id));
    toast({ title: `${ids.length} deleted` });
    reportSkipped(ids.length, selected.size);
    exitSelection();
  };

  return (
    <AppLayout>
      <div className={cn(
        "max-w-5xl mx-auto px-4 py-6 md:py-10",
        selectionMode ? "pb-44 md:pb-32" : "pb-8 md:pb-12",
      )}>
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-body min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </Link>
          <Link
            to="/explore"
            className="text-sm font-body text-foreground hover:underline min-h-[44px] inline-flex items-center"
          >
            Explore →
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-5 gap-3">
          <h1 className="text-[20px] sm:text-[24px] font-display leading-tight">{formatTodayLong()}</h1>
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            {items.length > 0 && (
              <button
                onClick={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
                className="text-xs font-body px-3 py-2 rounded-full border border-border hover:border-foreground/40 transition-colors min-h-[36px] shrink-0"
              >
                {selectionMode ? "Done" : "Select"}
              </button>
            )}
            <div className="inline-flex border border-border rounded-full p-0.5 flex-1 sm:flex-none justify-center">
              <button
                onClick={() => {
                  setShowAll(false);
                  setMode("trending");
                }}
                className={cn(
                  "flex-1 sm:flex-none px-3 py-1.5 sm:py-1 rounded-full text-xs font-body transition-colors min-h-[32px]",
                  mode === "trending" ? "bg-foreground text-background" : "text-muted-foreground"
                )}
              >
                Trending
              </button>
              <button
                onClick={() => {
                  if (!hasLocation) setLocationPromptOpen(true);
                  else {
                    setShowAll(false);
                    setMode("local");
                  }
                }}
                className={cn(
                  "flex-1 sm:flex-none px-3 py-1.5 sm:py-1 rounded-full text-xs font-body transition-colors min-h-[32px]",
                  mode === "local" ? "bg-foreground text-background" : "text-muted-foreground"
                )}
              >
                Local
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm font-body">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm font-body py-12 text-center">
            {mode === "local" ? "No local debates yet in your area." : "No debates yet."}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map((d) => (
                <DebateCoverCard
                  key={d.id}
                  d={d}
                  selectionMode={selectionMode}
                  selected={selected.has(d.id)}
                  onToggleSelected={toggle}
                  onChanged={(action, id, patch) => {
                    if (action === "removed") removeItem(id);
                    else if (action === "updated" && patch) patchItem(id, patch);
                  }}
                />
              ))}
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

      <LocationPrompt
        open={locationPromptOpen}
        onOpenChange={setLocationPromptOpen}
        onSaved={() => setMode("local")}
      />
    </AppLayout>
  );
};

export default ForYouPage;
