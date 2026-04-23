import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { toast } from "sonner";

import AppLayout from "@/components/AppLayout";
import StudyFilterBar, { Filter, Sort } from "@/components/study/StudyFilterBar";
import NotebookCard from "@/components/study/NotebookCard";
import FolderRow from "@/components/study/FolderRow";
import MultiSelectActionBar from "@/components/study/MultiSelectActionBar";
import RenameDialog from "@/components/study/RenameDialog";
import {
  useMyStudy,
  isNotebookNonEmpty,
  notebookTitle,
  StudyFolder,
  StudyNotebook,
} from "@/hooks/useMyStudy";

const matchesQuery = (n: StudyNotebook, q: string, folders: StudyFolder[]) => {
  if (!q) return true;
  const needle = q.toLowerCase();
  const haystack = [
    notebookTitle(n),
    n.session_title || "",
    (n.thoughts as any)?.blocks?.[0]?.value || "",
    n.my_take || "",
    n.tags.map((t) => t.name).join(" "),
    folders.find((f) => f.id === n.folder_id)?.name || "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
};

const MyStudyPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilterState] = useState<Filter>(
    (searchParams.get("filter") as Filter) || "all",
  );
  const [sort, setSortState] = useState<Sort>((searchParams.get("sort") as Sort) || "newest");
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [showEmpty, setShowEmpty] = useState(false);

  const setFilter = (f: Filter) => {
    setFilterState(f);
    const next = new URLSearchParams(searchParams);
    next.set("filter", f);
    setSearchParams(next, { replace: true });
  };
  const setSort = (s: Sort) => {
    setSortState(s);
    const next = new URLSearchParams(searchParams);
    next.set("sort", s);
    setSearchParams(next, { replace: true });
  };

  const includeTrashed = filter === "trash";
  const study = useMyStudy({ includeTrashed });

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!selectMode) setSelectedIds(new Set());
  }, [selectMode]);

  // Folder dialogs
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameFolderState, setRenameFolderState] = useState<StudyFolder | null>(null);
  const [renameNotebookState, setRenameNotebookState] = useState<StudyNotebook | null>(null);

  // Counts (across all non-trash by default)
  const counts = useMemo(() => {
    const all = study.notebooks.filter((n) => !n.deleted_at && (showEmpty || isNotebookNonEmpty(n)));
    return {
      all: all.length,
      drafts: all.filter((n) => !n.published).length,
      published: all.filter((n) => n.published).length,
      trash: study.notebooks.filter((n) => n.deleted_at).length,
    };
  }, [study.notebooks, showEmpty]);

  // Visible notebooks (after filter, search, empty toggle)
  const visible = useMemo(() => {
    let list = study.notebooks.slice();
    if (filter === "trash") {
      list = list.filter((n) => n.deleted_at);
    } else {
      list = list.filter((n) => !n.deleted_at);
      if (!showEmpty) list = list.filter(isNotebookNonEmpty);
      if (filter === "drafts") list = list.filter((n) => !n.published);
      if (filter === "published") list = list.filter((n) => n.published);
    }
    list = list.filter((n) => matchesQuery(n, query, study.folders));
    list.sort((a, b) => {
      switch (sort) {
        case "oldest":
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case "session":
          return (
            new Date(b.session_created_at || b.created_at).getTime() -
            new Date(a.session_created_at || a.created_at).getTime()
          );
        case "annotations":
          return b.annotation_count - a.annotation_count;
        case "newest":
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });
    return list;
  }, [study.notebooks, study.folders, filter, sort, query, showEmpty]);

  const hiddenEmptyCount = useMemo(
    () =>
      filter !== "trash" && !showEmpty
        ? study.notebooks.filter((n) => !n.deleted_at && !isNotebookNonEmpty(n)).length
        : 0,
    [study.notebooks, filter, showEmpty],
  );

  // Group visible notebooks by folder
  const grouped = useMemo(() => {
    const byFolder = new Map<string | "root", StudyNotebook[]>();
    byFolder.set("root", []);
    for (const f of study.folders) byFolder.set(f.id, []);
    for (const n of visible) {
      const key = n.folder_id ?? "root";
      if (!byFolder.has(key)) byFolder.set("root", byFolder.get("root") || []);
      const arr = byFolder.get(key) || [];
      arr.push(n);
      byFolder.set(key, arr);
    }
    // sort within each folder by sort_index then updated_at
    for (const [k, arr] of byFolder) {
      arr.sort((a, b) => {
        if (sort === "newest" || sort === "oldest" || sort === "session" || sort === "annotations") {
          return 0; // already globally sorted; keep that order
        }
        return (a.sort_index || 0) - (b.sort_index || 0);
      });
      byFolder.set(k, arr);
    }
    return byFolder;
  }, [visible, study.folders, sort]);

  const toggleSelect = (id: string) => {
    if (!selectMode) setSelectMode(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const overId = String(over.id);
    const activeId = String(active.id);
    if (overId.startsWith("folder-")) {
      const folderKey = overId.replace("folder-", "");
      const folderId = folderKey === "root" ? null : folderKey;
      const dragged = study.notebooks.find((n) => n.id === activeId);
      if (dragged && dragged.folder_id !== folderId) {
        await study.moveNotebookToFolder(activeId, folderId);
        toast.success(folderId ? "Moved to folder" : "Moved to Uncategorized");
      }
    } else if (activeId !== overId) {
      // reorder within same folder
      const dragged = study.notebooks.find((n) => n.id === activeId);
      const target = study.notebooks.find((n) => n.id === overId);
      if (dragged && target && dragged.folder_id === target.folder_id) {
        const inFolder = (grouped.get(dragged.folder_id ?? "root") || []).map((n) => n.id);
        const from = inFolder.indexOf(activeId);
        const to = inFolder.indexOf(overId);
        if (from > -1 && to > -1) {
          const next = inFolder.slice();
          next.splice(from, 1);
          next.splice(to, 0, activeId);
          await study.reorderInFolder(dragged.folder_id, next);
        }
      }
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (filter === "trash") {
      if (!confirm(`Permanently delete ${ids.length} notebook${ids.length === 1 ? "" : "s"}?`)) return;
      await study.hardDelete(ids);
      toast.success("Deleted forever");
    } else {
      await study.softDelete(ids);
      toast.success("Moved to Trash");
    }
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const handleBulkMove = async (folderId: string | null) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await study.moveManyToFolder(ids, folderId);
    toast.success(folderId ? "Moved to folder" : "Moved to Uncategorized");
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const renderCard = (n: StudyNotebook) => (
    <NotebookCard
      key={n.id}
      notebook={n}
      folders={study.folders}
      selectMode={selectMode}
      selected={selectedIds.has(n.id)}
      onToggleSelect={toggleSelect}
      onRename={(id) => setRenameNotebookState(study.notebooks.find((x) => x.id === id) || null)}
      onMoveToFolder={async (id, folderId) => {
        await study.moveNotebookToFolder(id, folderId);
      }}
      onShare={async (id) => {
        const token = await study.generateShareToken(id);
        if (token) {
          await navigator.clipboard.writeText(`${window.location.origin}/study/shared/${token}`);
          toast.success("Private link copied");
        }
      }}
      onDelete={async (id) => {
        await study.softDelete([id]);
        toast.success("Moved to Trash");
      }}
      onRestore={async (id) => {
        await study.restore([id]);
        toast.success("Restored");
      }}
      onHardDelete={async (id) => {
        if (!confirm("Permanently delete this notebook?")) return;
        await study.hardDelete([id]);
        toast.success("Deleted forever");
      }}
      isTrashed={!!n.deleted_at}
    />
  );

  return (
    <AppLayout>
      <div className="max-w-3xl lg:max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 md:py-8 lg:py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-1 sm:mb-2">
            <Link
              to="/profile"
              className="text-muted-foreground hover:text-foreground p-1 -ml-1"
              aria-label="Back to profile"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-display">My Study</h1>
          </div>
          <p className="text-[15px] md:text-sm text-muted-foreground font-body mb-4 sm:mb-6">
            Your private notebooks from every session.
          </p>

          <StudyFilterBar
            filter={filter}
            setFilter={setFilter}
            counts={counts}
            sort={sort}
            setSort={setSort}
            query={query}
            setQuery={setQuery}
            selectMode={selectMode}
            toggleSelectMode={() => setSelectMode((v) => !v)}
            onCreateFolder={() => setCreateFolderOpen(true)}
          />

          {study.loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-accent animate-pulse" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-8 text-center">
              <h2 className="font-display text-lg mb-1">Nothing yet.</h2>
              <p className="text-sm text-muted-foreground font-body mb-4">
                Open any session record and start a notebook — it'll appear here automatically.
              </p>
              <Link
                to="/my-debates"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-body hover:opacity-90"
              >
                Browse my sessions
              </Link>
            </div>
          ) : (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="space-y-3">
                {study.folders.map((f) => {
                  const items = grouped.get(f.id) || [];
                  return (
                    <FolderRow
                      key={f.id}
                      folder={f}
                      count={items.length}
                      onRename={(folder) => setRenameFolderState(folder)}
                      onDelete={async (folder) => {
                        if (!confirm(`Delete folder "${folder.name}"? Notebooks inside will be moved to Uncategorized.`))
                          return;
                        await study.deleteFolder(folder.id);
                        toast.success("Folder deleted");
                      }}
                    >
                      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                        {items.map(renderCard)}
                      </SortableContext>
                    </FolderRow>
                  );
                })}
                <FolderRow folder={null} count={(grouped.get("root") || []).length}>
                  <SortableContext
                    items={(grouped.get("root") || []).map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {(grouped.get("root") || []).map(renderCard)}
                  </SortableContext>
                </FolderRow>
              </div>
            </DndContext>
          )}

          {hiddenEmptyCount > 0 && (
            <button
              type="button"
              onClick={() => setShowEmpty(true)}
              className="mt-6 text-xs text-muted-foreground hover:text-foreground font-body"
            >
              Show {hiddenEmptyCount} hidden empty notebook{hiddenEmptyCount === 1 ? "" : "s"}
            </button>
          )}
        </motion.div>
      </div>

      <MultiSelectActionBar
        count={selectedIds.size}
        folders={study.folders}
        onMove={handleBulkMove}
        onDelete={handleBulkDelete}
        onCancel={() => {
          setSelectedIds(new Set());
          setSelectMode(false);
        }}
      />

      <RenameDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        title="New folder"
        initialValue=""
        placeholder="Folder name"
        onSubmit={async (name) => {
          if (!name) return;
          await study.createFolder(name);
          toast.success("Folder created");
        }}
      />
      <RenameDialog
        open={!!renameFolderState}
        onOpenChange={(v) => !v && setRenameFolderState(null)}
        title="Rename folder"
        initialValue={renameFolderState?.name || ""}
        onSubmit={async (name) => {
          if (!renameFolderState || !name) return;
          await study.renameFolder(renameFolderState.id, name);
          toast.success("Folder renamed");
          setRenameFolderState(null);
        }}
      />
      <RenameDialog
        open={!!renameNotebookState}
        onOpenChange={(v) => !v && setRenameNotebookState(null)}
        title="Rename notebook"
        initialValue={renameNotebookState ? notebookTitle(renameNotebookState) : ""}
        onSubmit={async (name) => {
          if (!renameNotebookState) return;
          await study.renameNotebook(renameNotebookState.id, name);
          toast.success("Renamed");
          setRenameNotebookState(null);
        }}
      />
    </AppLayout>
  );
};

export default MyStudyPage;