import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import RecordCommentsSection from "@/components/comments/RecordCommentsSection";
import RecordShell from "@/components/record/RecordShell";
import ParticipantsRow from "@/components/record/ParticipantsRow";
import { useLiveParticipants } from "@/hooks/useLiveParticipants";
import { InsightsProvider } from "@/contexts/InsightsContext";

const SharedLiveSessionPage = () => {
  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      const { data, error } = await supabase
        .rpc("get_shared_live_session" as any, { _token: token });

      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) {
        setNotFound(true);
      } else {
        setSession({ ...row, share_token: token });
      }
      setLoading(false);
    };
    load();
  }, [token]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground animate-pulse">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  if (notFound || !session) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">Session not found or link has expired.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SharedLiveBody session={session} />
    </AppLayout>
  );
};

export default SharedLiveSessionPage;

function SharedLiveBody({ session }: { session: any }) {
  const speakerNames: Record<string, string> = session.speaker_names || {};
  const entries: any[] = session.transcript_entries || [];
  const subtopicTitles: string[] = session.subtopics || [];
  const pills = useLiveParticipants({
    sessionId: session.id,
    speakerNames,
    createdBy: session.created_by ?? null,
  });
  const transcriptInputs = entries.map((e: any) => ({
    id: e.id,
    speaker_side: speakerNames[String(e.speaker_id)] || `Speaker ${e.speaker_id + 1}`,
    text: e.text,
    subtopic: e.subtopic || subtopicTitles[0] || "",
    timestamp: e.timestamp,
    ai_summary: e.ai_summary,
  }));
  return (
    <InsightsProvider sessionId={session.id} sessionKind="live">
      <RecordShell
        kind="live"
        topic={session.title || "Live Session"}
        description={session.description ?? null}
        status="completed"
        coverImageUrl={session.cover_image_url ?? null}
        createdAt={session.created_at}
        pillsRow={
          pills.length > 0 ? (
            <ParticipantsRow
              pills={pills.map((p) => ({
                kind: "user" as const,
                name: p.name,
                avatarUrl: p.avatarUrl,
                userId: p.userId,
              }))}
            />
          ) : null
        }
        subtopics={subtopicTitles.map((t) => ({ id: t, title: t }))}
        transcriptEntries={transcriptInputs}
        argumentMap={[]}
        sessionId={session.id}
        sessionKind="live"
        sessionComplete
      >
        <RecordCommentsSection recordType="live_session" recordId={session.id} />
      </RecordShell>
    </InsightsProvider>
  );
}
