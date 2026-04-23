import { useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import type { CmmTranscriptEntry } from "@/hooks/useCmmLiveCapture";
import { cn } from "@/lib/utils";

interface Props {
  entries: CmmTranscriptEntry[];
  interimText: string;
  isConnected: boolean;
  micError: string | null;
}

const CmmLiveTranscript = ({ entries, interimText, isConnected, micError }: Props) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [entries.length, interimText]);

  return (
    <div className="rounded-2xl border border-border/60 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 bg-foreground/[0.02]">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
          {isConnected ? <Mic className="w-3.5 h-3.5 text-foreground" /> : <MicOff className="w-3.5 h-3.5 text-muted-foreground" />}
          <span className={isConnected ? "text-foreground" : "text-muted-foreground"}>
            {isConnected ? "Listening" : micError || "Idle"}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{entries.length} entries</span>
      </div>
      <div ref={scrollRef} className="max-h-72 overflow-y-auto p-3 space-y-2 text-sm">
        {entries.length === 0 && !interimText && (
          <p className="text-xs text-muted-foreground py-6 text-center">Speak — your words show up here.</p>
        )}
        {entries.map((e) => (
          <div key={e.id} data-entry-id={e.id} className={cn(
            "rounded-xl px-3 py-2 border",
            e.speaker_side === "owner"
              ? "border-border/60 bg-background"
              : "border-foreground/30 bg-foreground/[0.03]",
          )}>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
              {e.speaker_label}
            </div>
            <p className="leading-snug">{e.text}</p>
          </div>
        ))}
        {interimText && (
          <div className="rounded-xl px-3 py-2 border border-dashed border-border/60 text-muted-foreground italic">
            {interimText}
          </div>
        )}
      </div>
    </div>
  );
};

export default CmmLiveTranscript;