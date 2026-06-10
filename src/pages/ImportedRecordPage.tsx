import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Link2, FileText, Mic, FileImage } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import ArgumentMapContent from "@/components/debate/ArgumentMapContent";
import RecordCommentsSection from "@/components/comments/RecordCommentsSection";
import RecordToolsMount from "@/components/record/RecordToolsMount";
import { toast } from "sonner";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { InsightsProvider } from "@/contexts/InsightsContext";
import { PerformanceInsightsToggle } from "@/components/insights/PerformanceInsightsToggle";
import { useAuth } from "@/contexts/AuthContext";

interface ImportedRecord {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  source_kind: string;
  source_url: string | null;
  subtopics: any[];
  transcript_entries: any[];
  argument_map: any[];
  is_public: boolean;
  created_at: string;
}

const SOURCE_ICON: Record<string, typeof Link2> = {
  url: Link2, article: Link2, pdf: FileImage, media: Mic, text: FileText,
};

export default function ImportedRecordPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rec, setRec] = useState<ImportedRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"transcript" | "threaded">("transcript");

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
    return () => { cancelled = true; };
  }, [id, navigate]);

  // §21 Performance Intelligence — fire deep pass once the record is loaded
  // and the viewer is the owner. Idempotent server-side.
  useEffect(() => {
    if (!rec || !user?.id || rec.user_id !== user.id) return;
    supabase.functions
      .invoke("trigger-deep-perf", { body: { session_id: rec.id, session_kind: "imported" } })
      .catch(() => {});
  }, [rec?.id, rec?.user_id, user?.id]);

  const subtopics = useMemo(
    () => (rec?.subtopics ?? []).map((s: any) => ({ id: s.id ?? s.title, title: s.title })),
    [rec],
  );

  if (loading || !rec) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 py-10 text-sm text-muted-foreground">Loading…</div>
      </AppLayout>
    );
  }

  const SourceIcon = SOURCE_ICON[rec.source_kind] ?? FileText;

  return (
    <AppLayout>
      <InsightsProvider sessionId={rec.id} sessionKind="imported" participantId={user?.id}>
      <div className="max-w-3xl mx-auto px-4 py-6" data-record-root>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Download className="w-4 h-4 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-body">Imported record</span>
        </div>
        <h1 className="text-3xl font-serif text-foreground leading-tight mb-2">{rec.title}</h1>
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-body mb-6">
          <span className="inline-flex items-center gap-1">
            <SourceIcon className="w-3.5 h-3.5" /> {rec.source_kind}
          </span>
          {rec.source_url && (
            <a href={rec.source_url} target="_blank" rel="noreferrer" className="underline truncate max-w-[24rem]">
              {rec.source_url}
            </a>
          )}
          <span>·</span>
          <span>{new Date(rec.created_at).toLocaleDateString()}</span>
          <span>·</span>
          <span>{rec.is_public ? "Public" : "Private"}</span>
        </div>

        <div className="flex gap-1 mb-3 border-b border-foreground/10">
          <div className="flex flex-1 gap-1">
            {(["transcript", "threaded"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-2 text-xs uppercase tracking-widest font-body border-b-2 -mb-px transition-colors ${
                  tab === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "transcript" ? "Transcript" : "Argument map"}
              </button>
            ))}
          </div>
          <div className="flex items-center pb-2">
            <PerformanceInsightsToggle />
          </div>
        </div>

        <ArgumentMapContent
          tab={tab}
          subtopics={subtopics}
          transcriptEntries={rec.transcript_entries as any}
          argumentMap={rec.argument_map as any}
          sessionId={rec.id}
          sessionKind="imported"
          sessionComplete
        />

        <div className="mt-8 pt-6 border-t border-foreground/10">
          <RecordCommentsSection
            recordType={"imported_record" as any}
            recordId={rec.id}
            title="Comments"
          />
        </div>
      </div>
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
