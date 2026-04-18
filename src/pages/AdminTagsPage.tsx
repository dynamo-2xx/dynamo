import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Hash, Trash2, GitMerge, Star, Loader2, Plus } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useAllTags, type Tag, slugify } from "@/hooks/useTags";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminTagsPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { tags, refresh } = useAllTags();
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const [mergeSource, setMergeSource] = useState<Tag | null>(null);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (!user) navigate("/auth");
  }, [user, navigate]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, filter]);

  const officialTags = filtered.filter((t) => t.is_official);
  const communityTags = filtered.filter((t) => !t.is_official);

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

  const togglePromote = async (tag: Tag) => {
    setBusy(true);
    const { error } = await (supabase as any)
      .from("tags")
      .update({ is_official: !tag.is_official })
      .eq("id", tag.id);
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
    const { error } = await (supabase as any)
      .from("tags")
      .update({ name: next.trim(), slug: newSlug })
      .eq("id", tag.id);
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
    if (!window.confirm(`Move every record from "${mergeSource.name}" → "${target.name}" and delete the source?`))
      return;
    setBusy(true);
    // Fetch all join rows for source
    const { data: dts } = await (supabase as any)
      .from("debate_tags")
      .select("debate_id")
      .eq("tag_id", mergeSource.id);
    const { data: lsts } = await (supabase as any)
      .from("live_session_tags")
      .select("live_session_id")
      .eq("tag_id", mergeSource.id);

    // Insert target rows (ignore conflicts)
    for (const r of dts || []) {
      await (supabase as any)
        .from("debate_tags")
        .insert({ debate_id: r.debate_id, tag_id: target.id })
        .then(() => {})
        .catch(() => {});
    }
    for (const r of lsts || []) {
      await (supabase as any)
        .from("live_session_tags")
        .insert({ live_session_id: r.live_session_id, tag_id: target.id })
        .then(() => {})
        .catch(() => {});
    }
    // Delete source (cascade removes its join rows)
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
    const { error } = await (supabase as any)
      .from("tags")
      .insert({ name: name.trim(), slug, is_official: true, created_by: user.id });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Created");
      refresh();
    }
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
          Promote, rename, reparent, merge, or delete tags. Changes are live.
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
          {officialTags.map((t) => (
            <TagRow
              key={t.id}
              tag={t}
              tags={tags}
              busy={busy}
              mergeSource={mergeSource}
              onPromote={togglePromote}
              onRename={renameTag}
              onDelete={deleteTag}
              onReparent={reparent}
              onStartMerge={setMergeSource}
              onMergeInto={mergeInto}
            />
          ))}
          {officialTags.length === 0 && <EmptyHint text="No official tags." />}
        </Section>

        <Section title={`Community (${communityTags.length})`}>
          {communityTags.map((t) => (
            <TagRow
              key={t.id}
              tag={t}
              tags={tags}
              busy={busy}
              mergeSource={mergeSource}
              onPromote={togglePromote}
              onRename={renameTag}
              onDelete={deleteTag}
              onReparent={reparent}
              onStartMerge={setMergeSource}
              onMergeInto={mergeInto}
            />
          ))}
          {communityTags.length === 0 && <EmptyHint text="No community tags yet." />}
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
  busy,
  mergeSource,
  onPromote,
  onRename,
  onDelete,
  onReparent,
  onStartMerge,
  onMergeInto,
}: {
  tag: Tag;
  tags: Tag[];
  busy: boolean;
  mergeSource: Tag | null;
  onPromote: (t: Tag) => void;
  onRename: (t: Tag) => void;
  onDelete: (t: Tag) => void;
  onReparent: (t: Tag, parentId: string | null) => void;
  onStartMerge: (t: Tag) => void;
  onMergeInto: (t: Tag) => void;
}) => {
  const possibleParents = tags.filter((p) => p.id !== tag.id && p.parent_tag_id !== tag.id);
  return (
    <div className="border border-border rounded-xl px-4 py-3 bg-background">
      <div className="flex items-center gap-3">
        <Hash className="w-4 h-4 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-body font-medium text-sm truncate">{tag.name}</p>
            {tag.is_official && <Star className="w-3 h-3 text-foreground" />}
            <span className="text-[11px] text-muted-foreground">{tag.debate_count} uses</span>
          </div>
          <p className="text-[11px] text-muted-foreground truncate">/{tag.slug}</p>
        </div>
        <div className="flex items-center gap-1">
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
  );
};

export default AdminTagsPage;
