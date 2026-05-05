import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import EditableArgument from "@/components/debate/EditableArgument";
import { toast } from "sonner";

interface ArgumentRow {
  id: string;
  content: string;
  original_content: string | null;
  is_edited: boolean;
  argument_type: string;
  participant_id: string | null;
  subtopic_id: string | null;
  created_at: string;
}

const DebateEditArgumentsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState("");
  const [editEndsAt, setEditEndsAt] = useState<string | null>(null);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);
  const [mySideId, setMySideId] = useState<string | null>(null);
  const [sideLabels, setSideLabels] = useState<Record<string, { label: string; sortOrder: number }>>({});
  const [subtopicMap, setSubtopicMap] = useState<Record<string, { title: string; sortOrder: number }>>({});
  const [args, setArgs] = useState<ArgumentRow[]>([]);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const [d, parts, sides, subs, argsRes] = await Promise.all([
        supabase.from("debates").select("topic, edit_window_ends_at, status").eq("id", id).single(),
        supabase.from("debate_participants").select("id, user_id, side_id").eq("debate_id", id),
        supabase.from("debate_sides").select("id, label, sort_order").eq("debate_id", id),
        supabase.from("debate_subtopics").select("id, title, sort_order").eq("debate_id", id),
        supabase.from("arguments").select("*").eq("debate_id", id).order("created_at"),
      ]);
      if (d.data) {
        setTopic(d.data.topic);
        setEditEndsAt(d.data.edit_window_ends_at);
      }
      const me = (parts.data || []).find((p: any) => p.user_id === user.id);
      setMyParticipantId(me?.id || null);
      setMySideId(me?.side_id || null);
      const sm: Record<string, { label: string; sortOrder: number }> = {};
      (sides.data || []).forEach((s: any) => (sm[s.id] = { label: s.label, sortOrder: s.sort_order }));
      setSideLabels(sm);
      const tm: Record<string, { title: string; sortOrder: number }> = {};
      (subs.data || []).forEach((s: any) => (tm[s.id] = { title: s.title, sortOrder: s.sort_order }));
      setSubtopicMap(tm);
      setArgs((argsRes.data || []) as any);
      setLoading(false);
    })();
  }, [id, user]);

  const expired = editEndsAt ? new Date(editEndsAt).getTime() <= Date.now() : true;

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-10 text-sm text-muted-foreground">Loading…</div>
      </AppLayout>
    );
  }

  if (!myParticipantId) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-10">
          <p className="text-sm text-muted-foreground">You weren't a participant in this debate.</p>
        </div>
      </AppLayout>
    );
  }

  const myArgs = args
    .filter((a) => a.participant_id === myParticipantId)
    .sort((a, b) => {
      const sa = a.subtopic_id ? subtopicMap[a.subtopic_id]?.sortOrder ?? 0 : 0;
      const sb = b.subtopic_id ? subtopicMap[b.subtopic_id]?.sortOrder ?? 0 : 0;
      if (sa !== sb) return sa - sb;
      return a.created_at.localeCompare(b.created_at);
    });

  const sortedSides = Object.values(sideLabels).sort((a, b) => a.sortOrder - b.sortOrder);
  const mySideOrder = mySideId ? sortedSides.findIndex((s) => s.label === sideLabels[mySideId]?.label) : 0;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        <button
          onClick={() => navigate(`/debate/${id}`)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to debate
        </button>
        <h1 className="font-display text-2xl mb-1">Edit your arguments</h1>
        <p className="text-sm text-muted-foreground mb-6 truncate">{topic}</p>

        {expired && (
          <p className="text-sm text-muted-foreground italic mb-4">
            The edit window has closed. Your arguments are now finalized.
          </p>
        )}

        {myArgs.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">You haven't submitted any arguments.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(
              myArgs.reduce<Record<string, ArgumentRow[]>>((acc, a) => {
                const k = a.subtopic_id || "_";
                (acc[k] = acc[k] || []).push(a);
                return acc;
              }, {}),
            ).map(([subId, list]) => (
              <div key={subId}>
                <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-body font-medium mb-2">
                  {subtopicMap[subId]?.title || "Other"}
                </h2>
                <div className="space-y-3">
                  {list.map((a) => (
                    <EditableArgument
                      key={a.id}
                      id={a.id}
                      content={a.content}
                      originalContent={a.original_content}
                      isEdited={a.is_edited}
                      argumentType={a.argument_type}
                      sideLabel={mySideId ? sideLabels[mySideId]?.label || "" : ""}
                      sideOrder={mySideOrder >= 0 ? mySideOrder : 0}
                      isLeft={mySideOrder === 0}
                      canEdit={!expired}
                      onUpdate={(argId, newContent) =>
                        setArgs((prev) =>
                          prev.map((x) =>
                            x.id === argId
                              ? { ...x, content: newContent, is_edited: true, original_content: x.original_content || x.content }
                              : x,
                          ),
                        )
                      }
                    />
                  ))}
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