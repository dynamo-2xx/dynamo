import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Hash, Trash2, GitMerge, Star, Plus, ChevronDown, ChevronRight, ExternalLink, Radio, MessageSquare } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useAllTags, type Tag, slugify } from "@/hooks/useTags";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TaggedDebate {
  id: string;
  topic: string;
  status: string;
}
interface TaggedLive {
  id: string;
  title: string | null;
  status: string;
}

const AdminTagsPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { tags, refresh } = useAllTags();
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const [mergeSource, setMergeSource] = useState<Tag | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (!user) navigate("/auth");
  }, [user, navigate]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, filter]);

  // Build parent → children map
  const childrenByParent = useMemo(() => {
    const map = new Map<string, Tag[]>();
    for (const t of filtered) {
      if (t.parent_tag_id) {
        if (!map.has(t.parent_tag_id)) map.set(t.parent_tag_id, []);
        map.get(t.parent_tag_id)!.push(t);
      }
    }
    return map;
  }, [filtered]);

  const officialRoots = filtered.filter((t) => t.is_official && !t.parent_tag_id);
  const communityRoots = filtered.filter((t) => !t.is_official && !t.parent_tag_id);

  if (!user) return null;
  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-display mb-2">Admin only</h1>
          <p className="text-sm text-muted-foreground font-body">
            Your account doesn't have admin access. Contact the platform owner to have your role updated.
          </p>
        </div>
      </AppLayout>
    );
  }

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePromote = async (tag: Tag) => {
    setBusy(true);
    const { error } = await (supabase as any).from("tags").update({ is_official: !tag.is_official }).eq("id", tag.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(tag.is_official ? "Demoted" : "Promoted to official");
      refresh();
    }
  };

  const reparent = async (tag: Tag, parentId: string | null) => {
    setBusy(true);
    const { error } = await (supabase as any).from("tags").update({ parent_tag_id: parentId }).eq("id", tag.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Updated");
      refresh();
    }
  };

  const renameTag = async (tag: Tag) => {
    const next = window.prompt("Rename tag", tag.name);
    if (!next || next.trim() === tag.name) return;
    const newSlug = slugify(next);
    setBusy(true);
    const { error } = await (supabase as any).from("tags").update({ name: next.trim(), slug: newSlug }).eq("id", tag.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Renamed");
      refresh();
    }
  };

  const deleteTag = async (tag: Tag) => {
    if (!window.confirm(`Delete "${tag.name}"? Records will lose this tag.`)) return;
    setBusy(true);
    const { error } = await (supabase as any).from("tags").delete().eq("id", tag.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      refresh();
    }
  };

  const mergeInto = async (target: Tag) => {
    if (!mergeSource || mergeSource.id === target.id) {
      setMergeSource(null);
      return;
    }
    if (!window.confirm(`Move every record from "${mergeSource.name}" → "${target.name}" and delete the source?`)) return;
    setBusy(true);
    const { data: dts } = await (supabase as any).from("debate_tags").select("debate_id").eq("tag_id", mergeSource.id);
    const { data: lsts } = await (supabase as any).from("live_session_tags").select("live_session_id").eq("tag_id", mergeSource.id);
    for (const r of dts || []) {
      await (supabase as any).from("debate_tags").insert({ debate_id: r.debate_id, tag_id: target.id }).then(() => {}).catch(() => {});
    }
    for (const r of lsts || []) {
      await (supabase as any).from("live_session_tags").insert({ live_session_id: r.live_session_id, tag_id: target.id }).then(() => {}).catch(() => {});
    }
    const { error } = await (supabase as any).from("tags").delete().eq("id", mergeSource.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(`Merged into ${target.name}`);
      setMergeSource(null);
      refresh();
    }
  };

  const createOfficial = async () => {
    const name = window.prompt("New official tag name");
    if (!name) return;
    const slug = slugify(name);
    setBusy(true);
    const { error } = await (supabase as any).from("tags").insert({ name: name.trim(), slug, is_official: true, created_by: user.id });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Created");
      refresh();
    }
  };

  const addSubtopic = async (parent: Tag) => {
    const name = window.prompt(`New subtopic under "${parent.name}"`);
    if (!name) return;
    const slug = slugify(name);
    setBusy(true);
    const { error } = await (supabase as any).from("tags").insert({
      name: name.trim(),
      slug,
      is_official: parent.is_official,
      parent_tag_id: parent.id,
      created_by: user.id,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Subtopic created");
      setExpanded((prev) => new Set(prev).add(parent.id));
      refresh();
    }
  };

  const moveRecord = async (
    kind: "debate" | "live_session",
    recordId: string,
    fromTagId: string,
    toTagId: string,
  ) => {
    if (!toTagId || toTagId === fromTagId) return;
    const table = kind === "debate" ? "debate_tags" : "live_session_tags";
    const fk = kind === "debate" ? "debate_id" : "live_session_id";
    setBusy(true);
    // delete then insert (swap)
    const { error: delErr } = await (supabase as any).from(table).delete().eq(fk, recordId).eq("tag_id", fromTagId);
    if (delErr) {
      setBusy(false);
      toast.error(delErr.message);
      return;
    }
    const { error: insErr } = await (supabase as any).from(table).insert({ [fk]: recordId, tag_id: toTagId });
    setBusy(false);
    if (insErr) {
      // attempt to restore
      await (supabase as any).from(table).insert({ [fk]: recordId, tag_id: fromTagId });
      toast.error(insErr.message);
    } else {
      toast.success("Moved");
      refresh();
    }
  };

  const renderTagTree = (root: Tag) => {
    const children = childrenByParent.get(root.id) || [];
    return (
      <div key={root.id} className="space-y-2">
        <TagRow
          tag={root}
          tags={tags}
          children={children}
          busy={busy}
          mergeSource={mergeSource}
          expanded={expanded.has(root.id)}
          onToggleExpand={() => toggleExpand(root.id)}
          onPromote={togglePromote}
          onRename={renameTag}
          onDelete={deleteTag}
          onReparent={reparent}
          onStartMerge={setMergeSource}
          onMergeInto={mergeInto}
          onAddSubtopic={addSubtopic}
          onMoveRecord={moveRecord}
        />
        {children.length > 0 && (
          <div className="pl-6 space-y-2 border-l-2 border-border ml-3">
            {children.map((child) => (
              <TagRow
                key={child.id}
                tag={child}
                tags={tags}
                children={childrenByParent.get(child.id) || []}
                busy={busy}
                mergeSource={mergeSource}
                expanded={expanded.has(child.id)}
                onToggleExpand={() => toggleExpand(child.id)}
                onPromote={togglePromote}
                onRename={renameTag}
                onDelete={deleteTag}
                onReparent={reparent}
                onStartMerge={setMergeSource}
                onMergeInto={mergeInto}
                onAddSubtopic={addSubtopic}
                onMoveRecord={moveRecord}
                isChild
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
        <button
          onClick={() => navigate("/profile")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Profile
        </button>

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-display">Tag Console</h1>
          <button
            onClick={createOfficial}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-body bg-foreground text-background rounded-md hover:opacity-90"
          >
            <Plus className="w-3 h-3" /> New official
          </button>
        </div>
        <p className="text-sm text-muted-foreground font-body mb-6">
          Click a tag to view records, add subtopics, and reorganize.
        </p>

        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter tags…"
          className="w-full mb-6 bg-background border border-border rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:border-foreground/30"
        />

        {mergeSource && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-accent border border-border flex items-center justify-between gap-3">
            <p className="text-sm font-body">
              Merging <span className="font-medium">"{mergeSource.name}"</span> → click target tag's "Merge here" button.
            </p>
            <button onClick={() => setMergeSource(null)} className="text-xs text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>
        )}

        <Section title="Official">
          {officialRoots.map(renderTagTree)}
          {officialRoots.length === 0 && <EmptyHint text="No official tags." />}
        </Section>

        <Section title={`Community (${communityRoots.length})`}>
          {communityRoots.map(renderTagTree)}
          {communityRoots.length === 0 && <EmptyHint text="No community tags yet." />}
        </Section>
      </div>
    </AppLayout>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-8">
    <h3 className="font-display text-lg mb-3">{title}</h3>
    <div className="space-y-2">{children}</div>
  </div>
);

const EmptyHint = ({ text }: { text: string }) => (
  <p className="text-sm text-muted-foreground font-body italic">{text}</p>
);

const TagRow = ({
  tag,
  tags,
  children,
  busy,
  mergeSource,
  expanded,
  isChild,
  onToggleExpand,
  onPromote,
  onRename,
  onDelete,
  onReparent,
  onStartMerge,
  onMergeInto,
  onAddSubtopic,
  onMoveRecord,
}: {
  tag: Tag;
  tags: Tag[];
  children: Tag[];
  busy: boolean;
  mergeSource: Tag | null;
  expanded: boolean;
  isChild?: boolean;
  onToggleExpand: () => void;
  onPromote: (t: Tag) => void;
  onRename: (t: Tag) => void;
  onDelete: (t: Tag) => void;
  onReparent: (t: Tag, parentId: string | null) => void;
  onStartMerge: (t: Tag) => void;
  onMergeInto: (t: Tag) => void;
  onAddSubtopic: (t: Tag) => void;
  onMoveRecord: (kind: "debate" | "live_session", recordId: string, fromTagId: string, toTagId: string) => void;
}) => {
  const possibleParents = tags.filter((p) => p.id !== tag.id && p.parent_tag_id !== tag.id);
  const [debates, setDebates] = useState<TaggedDebate[]>([]);
  const [lives, setLives] = useState<TaggedLive[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    (async () => {
      setLoadingRecords(true);
      const [{ data: dts }, { data: lsts }] = await Promise.all([
        (supabase as any).from("debate_tags").select("debate:debates(id, topic, status)").eq("tag_id", tag.id),
        (supabase as any).from("live_session_tags").select("live:live_sessions(id, title, status)").eq("tag_id", tag.id),
      ]);
      if (cancelled) return;
      setDebates(((dts || []).map((r: any) => r.debate).filter(Boolean)) as TaggedDebate[]);
      setLives(((lsts || []).map((r: any) => r.live).filter(Boolean)) as TaggedLive[]);
      setLoadingRecords(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [expanded, tag.id]);

  return (
    <div className="border border-border rounded-xl bg-background">
      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleExpand}
            className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <Hash className="w-4 h-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-body font-medium text-sm truncate">{tag.name}</p>
              {tag.is_official && <Star className="w-3 h-3 text-foreground" />}
              {isChild && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">subtopic</span>}
              <span className="text-[11px] text-muted-foreground">{tag.debate_count} uses</span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">/{tag.slug}</p>
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {mergeSource && mergeSource.id !== tag.id && (
              <button
                onClick={() => onMergeInto(tag)}
                disabled={busy}
                className="px-2 py-1 text-[11px] font-body rounded bg-foreground text-background hover:opacity-90"
              >
                Merge here
              </button>
            )}
            <button
              onClick={() => onAddSubtopic(tag)}
              disabled={busy}
              className="px-2 py-1 text-[11px] font-body rounded border border-border hover:border-foreground/30 inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Subtopic
            </button>
            <button
              onClick={() => onPromote(tag)}
              disabled={busy}
              className="px-2 py-1 text-[11px] font-body rounded border border-border hover:border-foreground/30"
            >
              {tag.is_official ? "Demote" : "Promote"}
            </button>
            <button
              onClick={() => onRename(tag)}
              disabled={busy}
              className="px-2 py-1 text-[11px] font-body rounded border border-border hover:border-foreground/30"
            >
              Rename
            </button>
            <button
              onClick={() => onStartMerge(tag)}
              disabled={busy}
              className="px-2 py-1 text-[11px] font-body rounded border border-border hover:border-foreground/30 inline-flex items-center gap-1"
            >
              <GitMerge className="w-3 h-3" /> Merge
            </button>
            <button
              onClick={() => onDelete(tag)}
              disabled={busy}
              className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <label className="text-[11px] text-muted-foreground">Parent topic:</label>
          <select
            value={tag.parent_tag_id || ""}
            onChange={(e) => onReparent(tag, e.target.value || null)}
            disabled={busy}
            className="text-[11px] bg-accent rounded px-2 py-1 font-body focus:outline-none"
          >
            <option value="">— none —</option>
            {possibleParents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.is_official ? "★ " : ""}
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3 bg-accent/30">
          {loadingRecords ? (
            <p className="text-xs text-muted-foreground font-body italic">Loading records…</p>
          ) : (
            <>
              <RecordList
                title="Debates"
                icon={<MessageSquare className="w-3.5 h-3.5" />}
                emptyText="No debates under this tag."
                items={debates.map((d) => ({
                  id: d.id,
                  label: d.topic,
                  meta: d.status,
                  href: `/debate/${d.id}/preview`,
                }))}
                subtopics={children}
                onMove={(rid, toTagId) => onMoveRecord("debate", rid, tag.id, toTagId)}
              />
              <RecordList
                title="Live sessions"
                icon={<Radio className="w-3.5 h-3.5" />}
                emptyText="No live sessions under this tag."
                items={lives.map((l) => ({
                  id: l.id,
                  label: l.title || "Untitled session",
                  meta: l.status,
                  href: `/live/${l.id}`,
                }))}
                subtopics={children}
                onMove={(rid, toTagId) => onMoveRecord("live_session", rid, tag.id, toTagId)}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};

const RecordList = ({
  title,
  icon,
  emptyText,
  items,
  subtopics,
  onMove,
}: {
  title: string;
  icon: React.ReactNode;
  emptyText: string;
  items: { id: string; label: string; meta: string; href: string }[];
  subtopics: Tag[];
  onMove: (recordId: string, toTagId: string) => void;
}) => (
  <div>
    <div className="flex items-center gap-1.5 mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-body">
      {icon} {title} <span className="normal-case">({items.length})</span>
    </div>
    {items.length === 0 ? (
      <p className="text-xs text-muted-foreground font-body italic">{emptyText}</p>
    ) : (
      <div className="space-y-1.5">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-2 text-xs">
            <Link
              to={it.href}
              className="flex-1 min-w-0 inline-flex items-center gap-1 hover:text-foreground text-foreground/80 truncate"
            >
              <span className="truncate">{it.label}</span>
              <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
            </Link>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{it.meta}</span>
            {subtopics.length > 0 && (
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    onMove(it.id, e.target.value);
                    e.target.value = "";
                  }
                }}
                className="text-[10px] bg-background border border-border rounded px-1.5 py-0.5 font-body focus:outline-none"
              >
                <option value="">Move to subtopic…</option>
                {subtopics.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);

export default AdminTagsPage;
