import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Link2, FileText, Sparkles, Upload } from "lucide-react";
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
  const [mode, setMode] = useState<"url" | "text" | "file">("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("Fetching");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useDocumentMeta({
    title: "Import to Record · Dynamo",
    description: "Drop a link or transcript and get a fully threaded debate record.",
  });

  async function run() {
    if (mode === "url" && !url.trim()) return toast.error("Paste a URL first.");
    if ((mode === "text" || mode === "file") && text.trim().length < 200)
      return toast.error("Need at least a few paragraphs of text.");
    setBusy(true);
    setStage(mode === "url" ? "Fetching" : "Structuring");
    if (mode === "url") setTimeout(() => setStage("Structuring"), 2500);
    setTimeout(() => setStage("Building threads"), 7000);
    try {
      const { data, error } = await supabase.functions.invoke("import-to-record", {
        body: {
          kind: mode === "file" ? "text" : mode,
          source_url: mode === "url" ? url.trim() : undefined,
          raw_text: mode !== "url" ? text : undefined,
          title_hint: title.trim() || fileName || undefined,
        },
      });
      const payload: any = data ?? {};
      if (payload?.error === "tier_required" || (error as any)?.status === 402) {
        toast.error("Importing records is a Pro feature.");
        navigate("/pricing");
        return;
      }
      if (error) throw error;
      const id = payload?.debate_id;
      if (!id) throw new Error(payload?.message ?? "No record returned");
      toast.success("Record ready");
      navigate(`/debate/${id}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Import failed. Try a different source.");
      setBusy(false);
    }
  }

  async function onPickFile(f: File | null) {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return toast.error("File too large (max 5 MB for text imports).");
    const name = f.name.toLowerCase();
    if (!/\.(txt|md|markdown|srt|vtt)$/i.test(name)) {
      return toast.error("Only .txt, .md, .srt, or .vtt at the moment. PDF/audio coming soon.");
    }
    const t = await f.text();
    setText(t);
    setFileName(f.name);
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
          <button
            onClick={() => setMode("file")}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${mode === "file" ? "bg-foreground text-background" : "bg-background"}`}
          >
            <Upload className="w-3.5 h-3.5" /> Upload file
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
          ) : mode === "text" ? (
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Transcript text</label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste the full transcript here…"
                className="mt-1 min-h-48"
              />
            </div>
          ) : (
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Upload transcript</label>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void onPickFile(e.dataTransfer.files?.[0] ?? null);
                }}
                className="mt-1 border border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-foreground/40 transition-colors"
              >
                <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
                <div className="text-sm font-body text-foreground">
                  {fileName ? fileName : "Drop or click to choose a .txt, .md, .srt, or .vtt file"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  PDF, audio &amp; video imports coming soon.
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.markdown,.srt,.vtt,text/plain"
                className="hidden"
                onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
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