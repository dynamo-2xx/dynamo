import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, Check, X, RotateCcw } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface RoundSummary {
  id: string;
  subtopic_id: string;
  key_arguments: Array<{ side?: string; content?: string; type?: string; significance?: string }>;
}

interface EditRow {
  id: string;
  round_summary_id: string;
  item_index: number;
  side_label: string;
  original_content: string;
  edited_content: string;
  edited_by: string;
}

interface ItemView {
  subtopicId: string;
  subtopicTitle: string;
  subtopicOrder: number;
  roundSummaryId: string;
  itemIndex: number;
  sideLabel: string;
  originalContent: string;
  editedContent: string | null;
  isEdited: boolean;
  editId: string | null;
  canEdit: boolean;
}

const DebateEditArgumentsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState("");
  const [editEndsAt, setEditEndsAt] = useState<string | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [mySideLabel, setMySideLabel] = useState<string | null>(null);
  const [items, setItems] = useState<ItemView[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const [d, parts, sides, subs, summaries, edits] = await Promise.all([
        supabase.from("debates").select("topic, edit_window_ends_at").eq("id", id).single(),
        supabase
          .from("debate_participants")
          .select("id, user_id, side_id, participant_role")
          .eq("debate_id", id),
        supabase.from("debate_sides").select("id, label, sort_order").eq("debate_id", id),
        supabase.from("debate_subtopics").select("id, title, sort_order").eq("debate_id", id),
        supabase.from("round_summaries").select("id, subtopic_id, key_arguments").eq("debate_id", id),
        supabase
          .from("round_summary_item_edits" as any)
          .select("id, round_summary_id, item_index, side_label, original_content, edited_content, edited_by")
          .eq("debate_id", id),
      ]);

      if (d.data) {
        setTopic(d.data.topic);
        setEditEndsAt(d.data.edit_window_ends_at);
      }

      const me = (parts.data || []).find(
        (p: any) => p.user_id === user.id && p.participant_role === "speaker",
      );
      setIsParticipant(!!me);
      const mySide = me ? (sides.data || []).find((s: any) => s.id === me.side_id) : null;
      setMySideLabel(mySide?.label ?? null);

      const subOrder = new Map<string, { title: string; order: number }>();
      (subs.data || []).forEach((s: any) =>
        subOrder.set(s.id, { title: s.title, order: s.sort_order }),
      );

      const editsByKey = new Map<string, EditRow>();
      ((edits.data as unknown as EditRow[]) || []).forEach((e) =>
        editsByKey.set(`${e.round_summary_id}:${e.item_index}`, e),
      );

      const built: ItemView[] = [];
      ((summaries.data as unknown as RoundSummary[]) || []).forEach((rs) => {
        const sub = subOrder.get(rs.subtopic_id);
        if (!sub) return;
        (rs.key_arguments || []).forEach((ka, idx) => {
          const side = String(ka?.side ?? "").trim();
          const original = String(ka?.content ?? "").trim();
          if (!original) return;
          const editRow = editsByKey.get(`${rs.id}:${idx}`) || null;
          built.push({
            subtopicId: rs.subtopic_id,
            subtopicTitle: sub.title,
            subtopicOrder: sub.order,
            roundSummaryId: rs.id,
            itemIndex: idx,
            sideLabel: side,
            originalContent: editRow?.original_content || original,
            editedContent: editRow?.edited_content ?? null,
            isEdited: !!editRow,
            editId: editRow?.id ?? null,
            canEdit:
              !!mySide?.label &&
              side.toLowerCase() === String(mySide.label).toLowerCase(),
          });
        });
      });

      built.sort((a, b) =>
        a.subtopicOrder !== b.subtopicOrder
          ? a.subtopicOrder - b.subtopicOrder
          : a.itemIndex - b.itemIndex,
      );
      setItems(built);
      setLoading(false);
    })();
  }, [id, user]);

  const expired = editEndsAt ? new Date(editEndsAt).getTime() <= Date.now() : false;

  const keyOf = (it: ItemView) => `${it.roundSummaryId}:${it.itemIndex}`;

  const startEdit = (it: ItemView) => {
    setEditingKey(keyOf(it));
    setEditText(it.editedContent ?? it.originalContent);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditText("");
  };

  const saveEdit = async (it: ItemView) => {
    const newText = editText.trim();
    if (!newText) {
      cancelEdit();
      return;
    }
    if (newText === (it.editedContent ?? it.originalContent)) {
      cancelEdit();
      return;
    }
    if (!user) return;
    setSaving(true);
    const payload = {
      debate_id: id,
      round_summary_id: it.roundSummaryId,
      item_index: it.itemIndex,
      side_label: it.sideLabel,
      original_content: it.originalContent,
      edited_content: newText,
      edited_by: user.id,
    };
    const { data, error } = await (supabase as any)
      .from("round_summary_item_edits")
      .upsert(payload, { onConflict: "round_summary_id,item_index" })
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      toast.error("Couldn't save edit");
      return;
    }
    setItems((prev) =>
      prev.map((x) =>
        keyOf(x) === keyOf(it)
          ? { ...x, editedContent: newText, isEdited: true, editId: data?.id ?? x.editId }
          : x,
      ),
    );
    cancelEdit();
    toast.success("Edit saved");
  };

  const revertEdit = async (it: ItemView) => {
    if (!it.editId) return;
    const { error } = await (supabase as any)
      .from("round_summary_item_edits")
      .delete()
      .eq("id", it.editId);
    if (error) {
      toast.error("Couldn't revert");
      return;
    }
    setItems((prev) =>
      prev.map((x) =>
        keyOf(x) === keyOf(it)
          ? { ...x, editedContent: null, isEdited: false, editId: null }
          : x,
      ),
    );
    toast.success("Reverted to original");
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-10 text-sm text-muted-foreground">Loading…</div>
      </AppLayout>
    );
  }

  if (!isParticipant) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-10">
          <button
            onClick={() => navigate(`/debate/${id}`)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to debate
          </button>
          <p className="text-sm text-muted-foreground">
            Only speakers from the debate can edit summaries.
          </p>
        </div>
      </AppLayout>
    );
  }

  const myItems = items.filter((it) => it.canEdit);
  const grouped = myItems.reduce<Record<string, ItemView[]>>((acc, it) => {
    (acc[it.subtopicId] = acc[it.subtopicId] || []).push(it);
    return acc;
  }, {});

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        <button
          onClick={() => navigate(`/debate/${id}`)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to debate
        </button>
        <h1 className="font-display text-2xl mb-1">Edit your threads & summaries</h1>
        <p className="text-sm text-muted-foreground mb-2 truncate">{topic}</p>
        <p className="text-xs text-muted-foreground mb-6">
          Refine the AI-generated summaries of your arguments. The original wording is preserved
          and viewers can toggle back to it at any time. The transcript itself is never editable.
        </p>

        {expired && (
          <p className="text-sm text-muted-foreground italic mb-4">
            The edit window has closed. Your summaries are now finalized.
          </p>
        )}

        {myItems.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No summaries attributed to your side yet.
          </p>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([subId, list]) => (
              <div key={subId}>
                <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-body font-medium mb-2">
                  {list[0].subtopicTitle}
                </h2>
                <div className="space-y-3">
                  {list.map((it) => {
                    const k = keyOf(it);
                    const isEditing = editingKey === k;
                    const viewingOriginal = !!showOriginal[k];
                    const displayed =
                      it.isEdited && !viewingOriginal
                        ? (it.editedContent ?? it.originalContent)
                        : it.originalContent;
                    return (
                      <div
                        key={k}
                        className="rounded-xl border border-foreground/10 bg-card px-4 py-3 group relative"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                            {it.sideLabel}
                          </span>
                          {it.isEdited && (
                            <button
                              onClick={() =>
                                setShowOriginal((p) => ({ ...p, [k]: !p[k] }))
                              }
                              className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 transition-colors"
                              title="Toggle original / edited"
                            >
                              <RotateCcw className="w-3 h-3" />
                              {viewingOriginal ? "original" : "edited"}
                            </button>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full bg-background/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                              rows={4}
                              autoFocus
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => saveEdit(it)}
                                disabled={saving || !editText.trim()}
                                className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1 rounded text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                              >
                                <Check className="w-3 h-3" />
                                {saving ? "Saving…" : "Save"}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs"
                              >
                                <X className="w-3 h-3" /> Cancel
                              </button>
                              {it.isEdited && (
                                <button
                                  onClick={() => revertEdit(it)}
                                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs ml-auto"
                                >
                                  <RotateCcw className="w-3 h-3" /> Revert
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                              {displayed}
                            </p>
                            {!expired && (
                              <button
                                onClick={() => startEdit(it)}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default DebateEditArgumentsPage;