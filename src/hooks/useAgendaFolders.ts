import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface AgendaFolder {
  id: string;
  name: string;
  sort_index: number;
}

interface Store {
  folders: AgendaFolder[];
  assignments: Record<string, string | null>; // itemId -> folderId
}

const KEY = (uid: string) => `agenda.folders.v1.${uid}`;

function load(uid: string): Store {
  try {
    const raw = localStorage.getItem(KEY(uid));
    if (!raw) return { folders: [], assignments: {} };
    const parsed = JSON.parse(raw) as Store;
    return {
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
      assignments:
        parsed.assignments && typeof parsed.assignments === "object" ? parsed.assignments : {},
    };
  } catch {
    return { folders: [], assignments: {} };
  }
}

function save(uid: string, s: Store) {
  try {
    localStorage.setItem(KEY(uid), JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function genId() {
  return (typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36));
}

export function useAgendaFolders() {
  const { user } = useAuth();
  const [store, setStore] = useState<Store>({ folders: [], assignments: {} });

  useEffect(() => {
    if (!user) return;
    setStore(load(user.id));
  }, [user]);

  const persist = useCallback(
    (next: Store) => {
      if (!user) return;
      setStore(next);
      save(user.id, next);
    },
    [user],
  );

  const createFolder = useCallback(
    (name: string) => {
      const f: AgendaFolder = { id: genId(), name, sort_index: store.folders.length };
      persist({ ...store, folders: [...store.folders, f] });
      return f;
    },
    [store, persist],
  );

  const renameFolder = useCallback(
    (id: string, name: string) => {
      persist({
        ...store,
        folders: store.folders.map((f) => (f.id === id ? { ...f, name } : f)),
      });
    },
    [store, persist],
  );

  const deleteFolder = useCallback(
    (id: string) => {
      const nextAssignments = { ...store.assignments };
      for (const k of Object.keys(nextAssignments)) {
        if (nextAssignments[k] === id) nextAssignments[k] = null;
      }
      persist({
        folders: store.folders.filter((f) => f.id !== id),
        assignments: nextAssignments,
      });
    },
    [store, persist],
  );

  const assign = useCallback(
    (itemId: string, folderId: string | null) => {
      persist({
        ...store,
        assignments: { ...store.assignments, [itemId]: folderId },
      });
    },
    [store, persist],
  );

  const folderOf = useCallback(
    (itemId: string): string | null => store.assignments[itemId] ?? null,
    [store.assignments],
  );

  return {
    folders: store.folders,
    assignments: store.assignments,
    createFolder,
    renameFolder,
    deleteFolder,
    assign,
    folderOf,
  };
}