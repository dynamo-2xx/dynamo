import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Link2, FileText, Sparkles, Upload, Download } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import DynamoLoader from "@/components/DynamoLoader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Import — standalone creation surface. One source → one imported_record.
 * No debate/live/cmm structure picker. Output is a transcript + argument map.
 */

type SourceMode = "url" | "text" | "file";

const TEXT_EXTS = /\.(txt|md|markdown|srt|vtt)$/i;
const PDF_EXTS = /\.pdf$/i;
const MEDIA_EXTS = /\.(mp3|mp4|m4a|wav|webm|ogg|mov)$/i;

export default function ImportToRecordPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<SourceMode>("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("Fetching");
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [uploadedKind, setUploadedKind] = useState<"text" | "pdf" | "media" | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useDocumentMeta({
    title: "Import · Dynamo",
    description: "Turn a link, transcript, PDF, or recording into a transcript + argument map.",
  });

  async function run() {
    if (mode === "url" && !url.trim()) return toast.error("Paste a URL first.");
    if (mode === "text" && text.trim().length < 200)
      return toast.error("Need at least a few paragraphs of text.");
    if (mode === "file" && !uploadedPath && text.trim().length < 200)
      return toast.error("Upload a file or paste a longer transcript.");
    setBusy(true);
    setStage(
      uploadedKind === "media" ? "Transcribing"
      : mode === "url" ? "Fetching"
      : "Structuring",
    );
    setTimeout(() => setStage("Structuring"), 4000);
    setTimeout(() => setStage("Building argument map"), 9000);
    setTimeout(() => setStage("Finalizing"), 14000);
    try {
      const payloadKind: "url" | "text" | "pdf_upload" | "media_upload" =
        mode === "url" ? "url"
        : uploadedKind === "pdf" ? "pdf_upload"
        : uploadedKind === "media" ? "media_upload"
        : "text";
      const { data, error } = await supabase.functions.invoke("import-to-record", {
        body: {
          kind: payloadKind,
          source_url: mode === "url" ? url.trim() : undefined,
          raw_text: mode === "text" || (mode === "file" && !uploadedPath) ? text : undefined,
          storage_path: uploadedPath ?? undefined,
          title_hint: title.trim() || fileName || undefined,
        },
      });
      let payload: any = data ?? {};
      const status: number | undefined = (error as any)?.context?.status;
      if (error && (error as any)?.context && typeof (error as any).context.json === "function") {
        try { payload = await (error as any).context.clone().json(); } catch { /* ignore */ }
      }
      if (payload?.error === "tier_required" || status === 402) {
        toast.error("Importing is a Pro feature.");
        navigate("/pricing");
        return;
      }
      if (payload?.error === "daily_cap_reached" || status === 429) {
        toast.error(payload?.message ?? "Daily import limit reached. Try again tomorrow.");
        setBusy(false);
        return;
      }
      if (error) throw new Error(payload?.message ?? (error as any)?.message ?? "Import failed");
      const importId = payload?.imported_record_id;
      if (!importId) throw new Error(payload?.message ?? "No record returned");
      toast.success("Record ready");
      navigate(`/import/${importId}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Import failed. Try a different source.");
      setBusy(false);
    }
  }

  async function onPickFile(f: File | null) {
    if (!f) return;
    const name = f.name.toLowerCase();
    const isText = TEXT_EXTS.test(name);
    const isPdf = PDF_EXTS.test(name);
    const isMedia = MEDIA_EXTS.test(name);
    if (!isText && !isPdf && !isMedia) {
      return toast.error("Supported: .txt .md .srt .vtt .pdf .mp3 .mp4 .m4a .wav");
    }
    const maxBytes = isText ? 5 * 1024 * 1024 : isPdf ? 25 * 1024 * 1024 : 100 * 1024 * 1024;
    if (f.size > maxBytes) {
      const mb = Math.round(maxBytes / (1024 * 1024));
      return toast.error(`File too large (max ${mb} MB for this type).`);
    }
    setFileName(f.name);
    if (isText) {
      const t = await f.text();
      setText(t);
      setUploadedPath(null);
      setUploadedKind("text");
      return;
    }
    if (!user) return toast.error("Sign in to upload PDFs or media.");
    try {
      setUploading(true);
      const ext = name.split(".").pop() || "bin";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("imports").upload(path, f, {
        contentType: f.type || undefined,
        upsert: false,
      });
      if (upErr) throw upErr;
      setUploadedPath(path);
      setUploadedKind(isPdf ? "pdf" : "media");
      setText("");
      toast.success(`${isPdf ? "PDF" : "Recording"} uploaded`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  if (busy) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <DynamoLoader duration={90000} />
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
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2 mb-1">
          <Download className="w-5 h-5" />
          <h1 className="text-3xl font-serif">Import to record</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Drop a link, transcript, PDF, or recording. Dynamo returns a clean transcript and argument map — private by default.
        </p>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setMode("url"); setUploadedPath(null); setUploadedKind(null); }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${mode === "url" ? "bg-foreground text-background" : "bg-background"}`}
          >
            <Link2 className="w-3.5 h-3.5" /> URL
          </button>
          <button
            onClick={() => { setMode("text"); setUploadedPath(null); setUploadedKind(null); }}
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
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Article or PDF URL</label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Articles &amp; PDF URLs work. For audio/video, switch to{" "}
                <button type="button" className="underline" onClick={() => setMode("file")}>Upload file</button>.
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
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Upload transcript, PDF, or recording</label>
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
                  {uploading
                    ? `Uploading ${fileName}…`
                    : fileName
                      ? `${fileName}${uploadedKind ? ` · ${uploadedKind}` : ""}`
                      : "Drop or click to choose a file"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Text (.txt .md .srt .vtt · 5 MB) · PDF (25 MB) · Audio/Video (.mp3 .mp4 .m4a .wav · 100 MB)
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.markdown,.srt,.vtt,.pdf,.mp3,.mp4,.m4a,.wav,.webm,.ogg,.mov,text/plain,application/pdf,audio/*,video/*"
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
          <Button onClick={run} className="w-full" disabled={uploading}>
            <Sparkles className="w-4 h-4 mr-1.5" />
            Generate record
          </Button>
        </Card>
      </div>
    </AppLayout>
  );
}
