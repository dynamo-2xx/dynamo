import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import SessionRecordView from "@/components/live/record/SessionRecordViewV2";
import RecordCommentsSection from "@/components/comments/RecordCommentsSection";

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
      <SessionRecordView
        sessionId={session.id}
        title={session.title || "Live Session"}
        createdAt={session.created_at}
        endedAt={session.ended_at}
        transcriptEntries={session.transcript_entries || []}
        summaries={session.summaries || []}
        subtopics={session.subtopics || []}
        speakerNames={session.speaker_names || {}}
        shareToken={session.share_token}
        readOnly
      />
      <div className="max-w-5xl mx-auto px-4 pb-12">
        <RecordCommentsSection recordType="live_session" recordId={session.id} />
      </div>
    </AppLayout>
  );
};

export default SharedLiveSessionPage;
