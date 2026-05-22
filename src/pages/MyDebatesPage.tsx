import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, CheckSquare, X, FolderOpen } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDraggable,
} from "@dnd-kit/core";
import AppLayout from "@/components/AppLayout";
import DebateCoverCard, { type DebateCoverItem } from "@/components/home/DebateCoverCard";
import BulkActionBar from "@/components/home/BulkActionBar";
import FloatingSearch from "@/components/explore/FloatingSearch";
import FolderRow from "@/components/study/FolderRow";
import RenameDialog from "@/components/study/RenameDialog";
import MyAgendaFormatFilter from "@/components/home/MyAgendaFormatFilter";
import {
  MyAgendaFiltersProvider,
  useMyAgendaFilters,
} from "@/contexts/MyAgendaFiltersContext";
import { useAgendaFolders, type AgendaFolder } from "@/hooks/useAgendaFolders";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDeleteAnimation } from "@/hooks/useDeleteAnimation";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AgendaFilter = "all" | "active" | "scheduled" | "archive";

const Chip = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "px-3 py-1 rounded-full text-xs font-body whitespace-nowrap transition-colors border",
      active
        ? "bg-foreground text-background border-foreground"
        : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30",
    )}
  >
    {children}
  </button>
);

function classifyAgenda(item: DebateCoverItem): AgendaFilter {
  if (item.status === "archived" || item.status === "draft" || item.status === "completed")
    return "archive";
  if (item.status === "live") return "active";
  const sched = item.scheduled_at ? new Date(item.scheduled_at).getTime() : 0;
  if (item.status === "scheduled") {
    if (sched && sched > Date.now()) return "scheduled";
    if (item.is_public) return "active";
    return "scheduled";
  }
  return "archive";
}

const DraggableCardWrapper = ({
  id,
  enabled,
  children,
}: {
  id: string;
  enabled: boolean;
  children: React.ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled: !enabled });
  return (
    <div
      ref={setNodeRef}
      className={cn(isDragging && "opacity-50")}
      {...(enabled ? attributes : {})}
      {...(enabled ? listeners : {})}
    >
      {children}
    </div>
  );
};

const MyDebatesPageInner = () => {
  const { user } = useAuth();
  const { isRemoving, animateRemove } = useDeleteAnimation();
  const { matches } = useMyAgendaFilters();
  const agendaFolders = useAgendaFolders();

  const [items, setItems] = useState<DebateCoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AgendaFilter>("all");

  // Selection / bulk
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<DebateCoverItem | null>(null);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);

  // Folder dialogs
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameFolderState, setRenameFolderState] = useState<AgendaFolder | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);

      // Debates (created or participated)
      const { data: created } = await supabase
        .from("debates")
        .select("id, topic, status, format, cover_image_url, created_at, scheduled_at, is_public, created_by, debate_participants(count)")
        .eq("created_by", user.id)
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
          .select("id, topic, status, format, cover_image_url, created_at, scheduled_at, is_public, created_by, debate_participants(count)")
          .in("id", extraIds)
          .order("created_at", { ascending: false });
        extraDebates = data || [];
      }

      const debates: DebateCoverItem[] = [...(created || []), ...extraDebates].map((d: any) => ({
        kind: "debate",
        id: d.id,
        topic: d.topic,
        status: d.status,
        format: d.format,
        cover_image_url: d.cover_image_url,
        created_at: d.created_at,
        scheduled_at: d.scheduled_at,
        is_public: d.is_public,
        created_by: d.created_by,
        participant_count: d.debate_participants?.[0]?.count ?? 0,
      }));

      // Live sessions
      const { data: sessions } = await supabase
        .from("live_sessions" as any)
        .select("id, title, status, created_at, created_by, is_public")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      const liveItems: DebateCoverItem[] = (((sessions as any) || []) as any[]).map((s) => ({
        kind: "live_session",
        id: s.id,
        topic: s.title || "Untitled Live Session",
        status:
          s.status === "recording" ? "live" : s.status === "archived" ? "archived" : "completed",
        cover_image_url: null,
        created_at: s.created_at,
        is_public: !!s.is_public,
        created_by: s.created_by,
        participant_count: 0,
      }));

      const { data: imported } = await supabase
        .from("imported_records" as any)
        .select("id, title, cover_image_url, created_at, user_id, is_public")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const importedItems: DebateCoverItem[] = (((imported as any) || []) as any[]).map((r) => ({
        kind: "imported_record",
        id: r.id,
        topic: r.title || "Imported record",
        status: "completed",
        cover_image_url: r.cover_image_url,
        created_at: r.created_at,
        is_public: !!r.is_public,
        created_by: r.user_id,
        participant_count: 0,
      }));

      const all = [...debates, ...liveItems, ...importedItems].sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
      );
      setItems(all);
      setLoading(false);
    };
    load();
  }, [user]);

  const removeFromList = (id: string) =>
    setItems((prev) => prev.filter((d) => d.id !== id));

  const patchInList = (id: string, patch: Partial<DebateCoverItem>) =>
    setItems((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  // Filtering
  const counts = useMemo(() => {
    const acc = { all: items.length, active: 0, scheduled: 0, archive: 0 };
    for (const i of items) {
      const c = classifyAgenda(i);
      if (c === "active") acc.active++;
      else if (c === "scheduled") acc.scheduled++;
      else acc.archive++;
    }
    return acc;
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (filter !== "all" && classifyAgenda(i) !== filter) return false;
      if (!matches({ kind: i.kind, format: i.format ?? null })) return false;
      if (q && !i.topic.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, filter, matches, query]);

  // Group by folder
  const grouped = useMemo(() => {
    const map = new Map<string | "root", DebateCoverItem[]>();
    map.set("root", []);
    for (const f of agendaFolders.folders) map.set(f.id, []);
    for (const i of visible) {
      const fid = agendaFolders.folderOf(i.id);
      const key = fid && map.has(fid) ? fid : "root";
      const arr = map.get(key) || [];
      arr.push(i);
      map.set(key, arr);
    }
    return map;
  }, [visible, agendaFolders]);

  // Selection
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
    visible.filter((d) => user && d.created_by === user.id).map((d) => d.id);
  const allSelected = (() => {
    const ids = selectableIdsInView();
    return ids.length > 0 && ids.every((id) => selected.has(id));
  })();
  const ownedSelectedItems = () =>
    Array.from(selected)
      .map((id) => items.find((x) => x.id === id))
      .filter((x): x is DebateCoverItem => !!x && !!user && x.created_by === user.id);

  const bulkPrivacy = async (next: boolean) => {
    const all = ownedSelectedItems();
    if (all.length === 0) return;
    setBusy(true);
    const debateIds = all.filter((i) => !i.kind || i.kind === "debate").map((i) => i.id);
    const liveIds = all.filter((i) => i.kind === "live_session").map((i) => i.id);
    const importedIds = all.filter((i) => i.kind === "imported_record").map((i) => i.id);
    if (debateIds.length)
      await supabase.from("debates").update({ is_public: next }).in("id", debateIds);
    if (liveIds.length)
      await supabase.from("live_sessions" as any).update({ is_public: next } as any).in("id", liveIds);
    if (importedIds.length)
      await supabase.from("imported_records" as any).update({ is_public: next } as any).in("id", importedIds);
    setBusy(false);
    all.forEach((i) => patchInList(i.id, { is_public: next }));
    toast({ title: `${all.length} updated`, description: next ? "Now public" : "Now private" });
    exitSelection();
  };

  const bulkArchive = async () => {
    const all = ownedSelectedItems();
    if (all.length === 0) return;
    setBusy(true);
    const debateIds = all.filter((i) => !i.kind || i.kind === "debate").map((i) => i.id);
    const liveIds = all.filter((i) => i.kind === "live_session").map((i) => i.id);
    if (debateIds.length)
      await supabase.from("debates").update({ status: "archived" }).in("id", debateIds);
    if (liveIds.length)
      await supabase.from("live_sessions" as any).update({ status: "archived" } as any).in("id", liveIds);
    setBusy(false);
    const archivable = all.filter((i) => i.kind !== "imported_record");
    archivable.forEach((i) => patchInList(i.id, { status: "archived" }));
    toast({ title: `${archivable.length} archived` });
    exitSelection();
  };

  const bulkDelete = async () => {
    const list = ownedSelectedItems();
    if (list.length === 0) {
      setConfirmBulkDeleteOpen(false);
      return;
    }
    setBusy(true);
    const debateIds = list.filter((i) => !i.kind || i.kind === "debate").map((i) => i.id);
    const liveIds = list.filter((i) => i.kind === "live_session").map((i) => i.id);
    const importedIds = list.filter((i) => i.kind === "imported_record").map((i) => i.id);
    if (debateIds.length) await supabase.from("debates").delete().in("id", debateIds);
    if (liveIds.length) await supabase.from("live_sessions" as any).delete().in("id", liveIds);
    if (importedIds.length) await supabase.from("imported_records" as any).delete().in("id", importedIds);
    setBusy(false);
    setConfirmBulkDeleteOpen(false);
    animateRemove(list.map((i) => i.id), removeFromList);
    toast({ title: `${list.length} deleted` });
    exitSelection();
  };

  // DnD - drop card onto folder
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith("folder-")) return;
    const folderKey = overId.replace("folder-", "");
    const folderId = folderKey === "root" ? null : folderKey;
    agendaFolders.assign(String(active.id), folderId);
    toast({ title: folderId ? "Moved to folder" : "Moved to Uncategorized" });
  };

  const emptyMessage =
    filter === "archive"
      ? "Nothing in your archive yet. Drafts and archived items appear here."
      : filter === "scheduled"
      ? "Nothing scheduled."
      : "You haven't participated in any sessions yet.";

  const renderCard = (d: DebateCoverItem) => {
    const removing = isRemoving(d.id);
    const isOwner = !!user && d.created_by === user.id;
    return (
      <DraggableCardWrapper
        key={`${d.kind || "debate"}-${d.id}`}
        id={d.id}
        enabled={isOwner && !selectionMode}
      >
        <div className={cn("relative", removing && "deleting-item")}>
          <DebateCoverCard
            d={d}
            selectionMode={selectionMode}
            selected={selected.has(d.id)}
            onToggleSelected={toggle}
            onChanged={(action, id, patch) => {
              if (action === "removed") animateRemove(id, removeFromList);
              else if (action === "updated" && patch) patchInList(id, patch);
            }}
          />
          {!selectionMode && isOwner && (
            <div className="absolute bottom-2 right-2 z-30" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Move to folder"
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity w-7 h-7 rounded-full bg-background/95 border border-border text-foreground flex items-center justify-center"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 z-50">
                  <DropdownMenuItem onClick={() => agendaFolders.assign(d.id, null)}>
                    Uncategorized
                  </DropdownMenuItem>
                  {agendaFolders.folders.map((f) => (
                    <DropdownMenuItem key={f.id} onClick={() => agendaFolders.assign(d.id, f.id)}>
                      {f.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </DraggableCardWrapper>
    );
  };

  return (
    <AppLayout>
      <FloatingSearch value={query} onChange={setQuery} placeholder="Search my agenda…" />
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between gap-3 mb-2 pr-12">
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] inline-flex items-center justify-center -ml-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl sm:text-3xl font-display">My Agenda</h1>
            </div>
          </div>
          <p className="text-[15px] md:text-sm text-muted-foreground font-body mb-4 sm:mb-6">
            Every debate, live session, and record you've joined or created.
          </p>

          {/* Filter chips + format filter + actions */}
          <div className="space-y-3 mb-4">
            <div className="flex gap-2 overflow-x-auto -mx-3 sm:-mx-1 px-3 sm:px-1 pb-1 scrollbar-thin">
              <Chip active={filter === "all"} onClick={() => setFilter("all")}>
                All · {counts.all}
              </Chip>
              <Chip active={filter === "active"} onClick={() => setFilter("active")}>
                Active · {counts.active}
              </Chip>
              <Chip active={filter === "scheduled"} onClick={() => setFilter("scheduled")}>
                Scheduled · {counts.scheduled}
              </Chip>
              <Chip active={filter === "archive"} onClick={() => setFilter("archive")}>
                Archive · {counts.archive}
              </Chip>
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <MyAgendaFormatFilter />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCreateFolderOpen(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-xs font-body hover:border-foreground/30 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> New folder
                </button>
                <button
                  type="button"
                  onClick={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
                  className={cn(
                    "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-body transition-colors border",
                    selectionMode
                      ? "bg-foreground text-background border-foreground"
                      : "border-border hover:border-foreground/30",
                  )}
                >
                  {selectionMode ? (
                    <>
                      <X className="w-3.5 h-3.5" /> Cancel
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-3.5 h-3.5" /> Select
                    </>
                  )}
                </button>
                {selectionMode && (
                  <button
                    onClick={() => {
                      const ids = selectableIdsInView();
                      setSelected(allSelected ? new Set() : new Set(ids));
                    }}
                    className="text-xs font-body px-3 py-1.5 rounded-full border border-border hover:border-foreground/40 transition-colors"
                  >
                    {allSelected ? "Deselect all" : "Select all"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <p className="text-muted-foreground text-center py-12 animate-pulse">Loading…</p>
          ) : visible.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl px-6 py-10 text-center">
              <p className="text-sm font-body text-foreground mb-3">{emptyMessage}</p>
              <div className="flex justify-center gap-2 flex-wrap">
                <Link
                  to={user ? "/?highlight=actions" : "/auth"}
                  className="inline-flex items-center justify-center gap-2 border border-border/60 text-foreground rounded-xl px-4 py-2 font-body text-xs font-medium hover:bg-foreground/5 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Get Started
                </Link>
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border text-xs font-body hover:border-foreground/30 transition-colors"
                >
                  Explore
                </Link>
              </div>
            </div>
          ) : (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className={cn("space-y-3", selectionMode && "pb-44 md:pb-32")}>
                {agendaFolders.folders.map((f) => {
                  const arr = grouped.get(f.id) || [];
                  return (
                    <FolderRow
                      key={f.id}
                      folder={{ id: f.id, user_id: user?.id || "", name: f.name, sort_index: f.sort_index, updated_at: "" }}
                      count={arr.length}
                      onRename={(folder) =>
                        setRenameFolderState({ id: folder.id, name: folder.name, sort_index: 0 })
                      }
                      onDelete={async (folder) => {
                        if (!confirm(`Delete folder "${folder.name}"? Items return to Uncategorized.`))
                          return;
                        agendaFolders.deleteFolder(folder.id);
                        toast({ title: "Folder deleted" });
                      }}
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 group">
                        {arr.map(renderCard)}
                      </div>
                    </FolderRow>
                  );
                })}
                <FolderRow folder={null} count={(grouped.get("root") || []).length}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 group">
                    {(grouped.get("root") || []).map(renderCard)}
                  </div>
                </FolderRow>
              </div>
            </DndContext>
          )}
        </motion.div>
      </div>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes it and any related transcripts. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                const item = confirmDelete;
                if (!item) return;
                const table = item.kind === "live_session" ? ("live_sessions" as any) : "debates";
                await supabase.from(table).delete().eq("id", item.id);
                setConfirmDelete(null);
                animateRemove(item.id, removeFromList);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectionMode && (
        <BulkActionBar
          count={selected.size}
          busy={busy}
          onCancel={exitSelection}
          onMakePublic={() => bulkPrivacy(true)}
          onMakePrivate={() => bulkPrivacy(false)}
          onArchive={bulkArchive}
          onDelete={() => setConfirmBulkDeleteOpen(true)}
        />
      )}

      <AlertDialog open={confirmBulkDeleteOpen} onOpenChange={setConfirmBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {ownedSelectedItems().length} item{ownedSelectedItems().length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the selected items and any related transcripts. This can't be undone.
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

      <RenameDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        title="New folder"
        initialValue=""
        placeholder="Folder name"
        onSubmit={async (name) => {
          if (!name) return;
          agendaFolders.createFolder(name);
          toast({ title: "Folder created" });
        }}
      />
      <RenameDialog
        open={!!renameFolderState}
        onOpenChange={(v) => !v && setRenameFolderState(null)}
        title="Rename folder"
        initialValue={renameFolderState?.name || ""}
        onSubmit={async (name) => {
          if (!renameFolderState || !name) return;
          agendaFolders.renameFolder(renameFolderState.id, name);
          toast({ title: "Folder renamed" });
          setRenameFolderState(null);
        }}
      />
    </AppLayout>
  );
};

const MyDebatesPage = () => (
  <MyAgendaFiltersProvider>
    <MyDebatesPageInner />
  </MyAgendaFiltersProvider>
);

export default MyDebatesPage;