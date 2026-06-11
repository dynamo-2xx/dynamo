import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import RecordCommentsSection from "@/components/comments/RecordCommentsSection";
import RecordToolsMount from "@/components/record/RecordToolsMount";
import RecordShell from "@/components/record/RecordShell";
import RecordEditDialog from "@/components/record/RecordEditDialog";
import AnalysisProgress from "@/components/record/AnalysisProgress";
import { toast } from "sonner";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { InsightsProvider } from "@/contexts/InsightsContext";
import { useAuth } from "@/contexts/AuthContext";

function ImportProgressBar({ progress }: { progress?: { stage?: string; percent?: number; message?: string } | null }) {
  const pct = Math.max(3, Math.min(100, Math.round(progress?.percent ?? 5)));
  const stage = progress?.stage ?? "starting";
  const label = progress?.message ?? stageLabel(stage);
  return (
    <div className="mb-4 rounded-lg border border-foreground/10 bg-background/60 px-3 py-2.5">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground font-body mb-1.5">
        <span>Preparing your record</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-foreground transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-foreground/70 font-body">{label}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground font-body">
        You can stay on this page — the transcript and argument map fill in as they're ready.
      </p>
    </div>
  );
}

function stageLabel(stage: string): string {
  switch (stage) {
    case "fetching":    return "Fetching the source…";
    case "transcribing":return "Transcribing the audio…";
    case "outlining":   return "Identifying the topic and subtopics…";
    case "structuring": return "Building the transcript…";
    case "threading":   return "Mapping the argument threads…";
    case "done":        return "Done.";
    case "failed":      return "Something went wrong.";
    default:            return "Starting…";
  }
}

interface ImportedRecord {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  source_kind: string;
  source_url: string | null;
  cover_image_url?: string | null;
  subtopics: any[];
  transcript_entries: any[];
  argument_map: any[];
  is_public: boolean;
  created_at: string;
  status?: "processing" | "ready" | "failed";
  progress?: { stage?: string; percent?: number; message?: string } | null;
}

export default function ImportedRecordPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rec, setRec] = useState<ImportedRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useDocumentMeta({ title: rec?.title ? `${rec.title} · Imported` : "Imported record · Dynamo" });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("imported_records" as any)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        toast.error("Record not found");
        navigate("/");
        return;
      }
      setRec(data as unknown as ImportedRecord);
      setLoading(false);
    })();
    // Subscribe to live updates so the progress bar reflects the pipeline.
    const ch = supabase
      .channel(`imported_records:${id}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "imported_records", filter: `id=eq.${id}` },
        (payload) => {
          if (cancelled) return;
          setRec((prev) => ({ ...(prev as any), ...(payload.new as any) }) as ImportedRecord);
        })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [id, navigate]);

  // §21 Performance Intelligence — fire deep pass once processing is complete
  // (the importer also kicks it; this covers older records). Idempotent.
  useEffect(() => {
    if (!rec || !user?.id || rec.user_id !== user.id) return;
    if (rec.status && rec.status !== "ready") return;
    supabase.functions
      .invoke("trigger-deep-perf", { body: { session_id: rec.id, session_kind: "imported" } })
      .catch(() => {});
    supabase.functions
      .invoke("trigger-structure-pass", {
        body: { session_id: rec.id, session_kind: "imported", pass_kind: "structure_final" },
      })
      .catch(() => {});
  }, [rec?.id, rec?.user_id, rec?.status, user?.id]);

  const subtopics = useMemo(
    () => {
      const arr = (rec?.subtopics ?? []).slice();
      arr.sort((a: any, b: any) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0));
      return arr.map((s: any) => ({
        id: s.id ?? s.title,
        title: s.title,
        parent_id: s.parent_id ?? null,
      }));
    },
    [rec],
  );

  if (loading || !rec) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 py-10 text-sm text-muted-foreground">Loading…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <InsightsProvider sessionId={rec.id} sessionKind="imported" participantId={user?.id}>
      <RecordShell
        kind="imported"
        topic={rec.title}
        description={rec.description}
        status={rec.status === "ready" ? "completed" : (rec.status ?? "completed")}
        coverImageUrl={rec.cover_image_url ?? null}
        createdAt={rec.created_at}
        importedSourceUrl={rec.source_url}
        importedSourceKind={rec.source_kind}
        editSlot={
          user?.id && user.id === rec.user_id ? (
            <RecordEditDialog
              initial={{
                title: rec.title,
                description: rec.description,
                coverImageUrl: rec.cover_image_url ?? null,
              }}
              coverSeed={rec.title}
              onSave={async (next) => {
                const patch: Record<string, any> = {
                  description: next.description,
                  cover_image_url: next.coverImageUrl,
                };
                if (typeof next.title === "string" && next.title.length > 0) {
                  patch.title = next.title;
                }
                const { error } = await supabase
                  .from("imported_records" as any)
                  .update(patch)
                  .eq("id", rec.id);
                if (error) throw error;
                setRec({ ...rec, ...patch } as ImportedRecord);
              }}
            />
          ) : null
        }
        belowBack={
          <>
            {rec.status === "processing" && (
              <ImportProgressBar progress={rec.progress} />
            )}
            {rec.status === "failed" && (
              <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs font-body text-rose-700 dark:text-rose-300">
                Import failed{rec.progress?.message ? `: ${rec.progress.message}` : "."} Try a different source.
              </div>
            )}
            {(rec.status === "ready" || rec.status === "completed") && (
              <AnalysisProgress
                sessionId={rec.id}
                sessionKind="imported"
                transcriptEntries={(rec.transcript_entries as any[]) ?? []}
              />
            )}
          </>
        }
        subtopics={subtopics}
        transcriptEntries={rec.transcript_entries as any}
        argumentMap={rec.argument_map as any}
        sessionId={rec.id}
        sessionKind="imported"
        sessionComplete
        sessionStartMs={(() => {
          const t = new Date(rec.created_at).getTime();
          return Number.isFinite(t) ? t : null;
        })()}
      >
        <RecordCommentsSection
          recordType={"imported_record" as any}
          recordId={rec.id}
          title="Comments"
        />
      </RecordShell>
      <RecordToolsMount
        recordType="imported_record"
        recordId={rec.id}
        transcriptEntries={rec.transcript_entries as any}
        subtopics={subtopics.map((s) => s.title)}
      />
      </InsightsProvider>
    </AppLayout>
  );
}
