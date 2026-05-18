import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Link2, FileText, Sparkles } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import DynamoLoader from "@/components/DynamoLoader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

/**
 * §25 Import-to-Record — second dropbox flow on /create/import.
 * v1: article URL or pasted text. Audio/video/PDF planned next.
 */
export default function ImportToRecordPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("Fetching");

  useDocumentMeta({
    title: "Import to Record · Dynamo",
    description: "Drop a link or transcript and get a fully threaded debate record.",
  });

  async function run() {
    if (mode === "url" && !url.trim()) return toast.error("Paste a URL first.");
    if (mode === "text" && text.trim().length < 200) return toast.error("Paste at least a few paragraphs.");
    setBusy(true);
    setStage(mode === "url" ? "Fetching" : "Structuring");
    try {
      const { data, error } = await supabase.functions.invoke("import-to-record", {
        body: {
          kind: mode,
          source_url: mode === "url" ? url.trim() : undefined,
          raw_text: mode === "text" ? text : undefined,
          title_hint: title.trim() || undefined,
        },
      });
      if (error) throw error;
      const id = (data as any)?.debate_id;
      if (!id) throw new Error((data as any)?.message ?? "No record returned");
      toast.success("Record ready");
      navigate(`/debate/${id}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Import failed. Try a different source.");
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <DynamoLoader duration={60000} />
        <div className="absolute bottom-20 inset-x-0 text-center text-xs text-muted-foreground font-body uppercase tracking-widest">
          {stage}…
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/create")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to create
        </button>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5" />
          <h1 className="text-3xl font-serif">Already have a debate?</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Drop a link or paste a transcript. Dynamo will return a threaded record you can annotate, share, and continue. Private by default.
        </p>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode("url")}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${mode === "url" ? "bg-foreground text-background" : "bg-background"}`}
          >
            <Link2 className="w-3.5 h-3.5" /> URL
          </button>
          <button
            onClick={() => setMode("text")}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${mode === "text" ? "bg-foreground text-background" : "bg-background"}`}
          >
            <FileText className="w-3.5 h-3.5" /> Paste transcript
          </button>
        </div>

        <Card className="p-5 space-y-4">
          {mode === "url" ? (
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Article URL</label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Audio &amp; video imports coming soon — paste the article link or transcript text for now.
              </p>
            </div>
          ) : (
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Transcript text</label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste the full transcript here…"
                className="mt-1 min-h-48"
              />
            </div>
          )}
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Title hint (optional)</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lincoln–Douglas debate transcript"
              className="mt-1"
            />
          </div>
          <Button onClick={run} className="w-full">Import as record</Button>
        </Card>
      </div>
    </AppLayout>
  );
}