import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Copy, RefreshCw, Tv, Plus, Minus, Check } from "lucide-react";
import { toast } from "sonner";
import { makeQrDataUrl } from "@/lib/qr";

interface InPersonJoinPanelProps {
  debateId: string | null;
  joinCode: string | null;
  maxSpeakersPerSide: number;
  onMaxSpeakersChange: (n: number) => void;
  onCodeRegenerated?: (newCode: string) => void;
  /** Live counts so the creator can see the room filling up. */
  speakerCounts?: { sideId: string; sideLabel: string; count: number }[];
}

export default function InPersonJoinPanel({
  debateId,
  joinCode,
  maxSpeakersPerSide,
  onMaxSpeakersChange,
  onCodeRegenerated,
  speakerCounts,
}: InPersonJoinPanelProps) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const joinUrl = joinCode ? `${window.location.origin}/join/${joinCode}` : "";

  useEffect(() => {
    if (!joinUrl) return;
    let cancelled = false;
    makeQrDataUrl(joinUrl, 320)
      .then((url) => !cancelled && setQr(url))
      .catch(() => !cancelled && setQr(null));
    return () => {
      cancelled = true;
    };
  }, [joinUrl]);

  const copy = async (text: string, what: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      toast.error("Couldn't copy.");
    }
  };

  const regenerate = async () => {
    if (!debateId || regenerating) return;
    setRegenerating(true);
    try {
      // Generate an 8-char code client-side; DB trigger only fires when null.
      const fresh = Array.from({ length: 8 })
        .map(() => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)])
        .join("");
      const { error } = await supabase
        .from("debates")
        .update({ join_code: fresh })
        .eq("id", debateId);
      if (error) throw error;
      onCodeRegenerated?.(fresh);
      toast.success("New code generated.");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't regenerate code.");
    } finally {
      setRegenerating(false);
    }
  };

  const openProjector = () => {
    if (!debateId) return;
    window.open(`/debate/${debateId}/project-code`, "_blank", "noopener,noreferrer");
  };

  if (!debateId || !joinCode) {
    return (
      <div className="bg-accent/40 border border-dashed border-border rounded-lg p-4 text-xs text-muted-foreground font-body">
        Saving draft to generate your join code…
      </div>
    );
  }

  return (
    <div className="bg-accent/40 border border-border rounded-lg p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-center">
        <div className="space-y-3 min-w-0">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body font-medium mb-1">
              Join code
            </p>
            <button
              type="button"
              onClick={() => copy(joinCode, "code")}
              className="font-mono text-3xl font-bold tracking-[0.25em] text-foreground hover:opacity-80 transition-opacity"
              aria-label="Copy code"
            >
              {joinCode}
            </button>
            <span className="ml-2 text-[10px] text-muted-foreground font-body">
              {copied === "code" ? "Copied!" : "(tap to copy)"}
            </span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body font-medium mb-1">
              Share link
            </p>
            <div className="flex items-center gap-2 bg-background border border-border rounded-md px-2 py-1.5">
              <span className="text-xs font-mono text-foreground truncate flex-1">{joinUrl}</span>
              <button
                type="button"
                onClick={() => copy(joinUrl, "link")}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                aria-label="Copy link"
              >
                {copied === "link" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex justify-center sm:justify-end">
          {qr ? (
            <img
              src={qr}
              alt="QR code to join the debate"
              className="w-32 h-32 sm:w-36 sm:h-36 rounded-md bg-white p-1 border border-border"
            />
          ) : (
            <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-md bg-background border border-border" />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body font-medium mb-1">
            Max speakers per side
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onMaxSpeakersChange(Math.max(1, maxSpeakersPerSide - 1))}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Decrease cap"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-lg font-display text-foreground w-6 text-center">{maxSpeakersPerSide}</span>
            <button
              type="button"
              onClick={() => onMaxSpeakersChange(Math.min(8, maxSpeakersPerSide + 1))}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Increase cap"
            >
              <Plus className="w-4 h-4" />
            </button>
            <span className="text-[10px] text-muted-foreground font-body ml-1">extras join as audience</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={regenerate}
            disabled={regenerating}
            className="text-xs font-body text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
            New code
          </button>
          <button
            type="button"
            onClick={openProjector}
            className="text-xs font-body bg-foreground text-background rounded-md px-3 py-1.5 flex items-center gap-1 hover:opacity-90 transition-opacity"
          >
            <Tv className="w-3.5 h-3.5" />
            Project
          </button>
        </div>
      </div>

      {speakerCounts && speakerCounts.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          {speakerCounts.map((s) => (
            <span
              key={s.sideId}
              className="text-[11px] font-body bg-background border border-border rounded-full px-2 py-0.5 text-muted-foreground"
            >
              <span className="text-foreground font-medium">{s.count}</span>
              <span className="mx-1 opacity-60">·</span>
              {s.sideLabel}
            </span>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground font-body leading-relaxed">
        Anyone who scans signs in (or creates an account), tests their mic, then picks their side. Their profile appears
        live in <span className="text-foreground">Invited Speakers</span> and on their chosen side.
      </p>
    </div>
  );
}