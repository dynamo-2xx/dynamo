import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X, Hash, Loader2 } from "lucide-react";
import { useAllTags, useRecordTags, useTagMutations, type Tag } from "@/hooks/useTags";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TagPickerProps {
  kind: "debate" | "live_session";
  recordId: string | null;
  /** When recordId is null (e.g. before debate is created), the picker behaves as a controlled buffer. */
  buffered?: Tag[];
  onBufferedChange?: (tags: Tag[]) => void;
  max?: number;
  compact?: boolean;
}

const TagPicker = ({
  kind,
  recordId,
  buffered,
  onBufferedChange,
  max = 5,
  compact = false,
}: TagPickerProps) => {
  const { tags: persistedTags, refresh } = useRecordTags(kind, recordId);
  const { tags: allTags } = useAllTags();
  const { findOrCreateTag, attachTag, detachTag } = useTagMutations();

  const selected = recordId ? persistedTags : (buffered || []);

  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Collapse on outside click / escape
  useEffect(() => {
    if (!expanded) return;
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setExpanded(false);
        setQuery("");
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpanded(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [expanded]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedIds = new Set(selected.map((t) => t.id));
    const base = allTags.filter((t) => !selectedIds.has(t.id));
    if (!q) return base.slice(0, 8);
    return base
      .filter((t) => t.name.toLowerCase().includes(q) || t.slug.includes(q))
      .slice(0, 8);
  }, [allTags, query, selected]);

  const exactMatch = useMemo(
    () => allTags.find((t) => t.name.toLowerCase() === query.trim().toLowerCase()),
    [allTags, query],
  );

  const addTag = async (tag: Tag) => {
    if (selected.length >= max) {
      toast.error(`Max ${max} tags`);
      return;
    }
    if (recordId) {
      setBusy(true);
      const ok = await attachTag(kind, recordId, tag.id);
      setBusy(false);
      if (ok) {
        refresh();
        setQuery("");
      } else {
        toast.error("Couldn't attach tag");
      }
    } else {
      onBufferedChange?.([...(buffered || []), tag]);
      setQuery("");
    }
  };

  const removeTag = async (tag: Tag) => {
    if (recordId) {
      setBusy(true);
      const ok = await detachTag(kind, recordId, tag.id);
      setBusy(false);
      if (ok) refresh();
    } else {
      onBufferedChange?.((buffered || []).filter((t) => t.id !== tag.id));
    }
  };

  const handleCreate = async () => {
    const name = query.trim();
    if (!name) return;
    if (selected.length >= max) {
      toast.error(`Max ${max} tags`);
      return;
    }
    setBusy(true);
    const tag = await findOrCreateTag(name);
    setBusy(false);
    if (tag) {
      await addTag(tag);
    } else {
      toast.error("Couldn't create tag");
    }
  };

  const canAddMore = selected.length < max;

  return (
    <div ref={wrapRef} className={cn("space-y-2", compact && "space-y-1.5")}>
      {/* Compact chip row — always visible */}
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-foreground text-background text-[11px] font-body"
          >
            <Hash className="w-3 h-3" />
            {t.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(t);
              }}
              disabled={busy}
              className="ml-0.5 hover:opacity-80"
              aria-label={`Remove ${t.name}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {canAddMore && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-dashed border-border text-[11px] font-body text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
          >
            <Plus className="w-3 h-3" />
            {selected.length === 0 ? "Add tags" : "Add"}
          </button>
        )}
      </div>

      {/* Expanded picker */}
      {expanded && canAddMore && (
        <div className="relative">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (exactMatch) addTag(exactMatch);
                else handleCreate();
              }
            }}
            placeholder="Search or create a tag (e.g. Politics)…"
            className="w-full bg-accent rounded-lg px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
          />
          {(query.trim() || suggestions.length > 0) && (
            <div className="mt-1 max-h-56 overflow-auto bg-background border border-border rounded-lg shadow-sm">
              {suggestions.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => addTag(t)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm font-body hover:bg-accent transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Hash className="w-3 h-3 text-muted-foreground" />
                    {t.name}
                    {t.is_official && (
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground ml-1">
                        Official
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{t.debate_count}</span>
                </button>
              ))}
              {query.trim() && !exactMatch && (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={busy}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-body hover:bg-accent transition-colors border-t border-border"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Create "{query.trim()}"
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground font-body">
        {selected.length}/{max} tags · helps people on Explore find this
      </p>
    </div>
  );
};

export default TagPicker;
