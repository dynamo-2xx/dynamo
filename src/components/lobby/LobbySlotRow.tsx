import { Mic, MicOff, X } from "lucide-react";
import type { MicConnection } from "@/hooks/useMicLobby";

interface SlotDef {
  key: string;
  label: string;
  hint?: string;
}

interface Props {
  slot: SlotDef;
  connection: MicConnection | null;
  onRelease?: (id: string) => void;
}

export default function LobbySlotRow({ slot, connection, onRelease }: Props) {
  const lit = (connection?.last_audio_rms ?? 0) > 0.05;
  const bars = 12;
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 border border-border/60 rounded-lg bg-background">
      <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center overflow-hidden shrink-0">
        {connection?.avatar_url ? (
          <img src={connection.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-display text-muted-foreground">
            {(connection?.display_name ?? slot.label).slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-display text-foreground truncate">
          {connection?.display_name || slot.label}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">
          {connection
            ? connection.mode === "own_mic"
              ? "Own mic · connected"
              : "Voice-detection only"
            : slot.hint || "Waiting for participant"}
        </p>
      </div>
      {connection?.mode === "own_mic" ? (
        <div className="flex items-end gap-[2px] h-5 w-16">
          {Array.from({ length: bars }).map((_, i) => {
            const t = (i + 1) / bars;
            const on = (connection?.last_audio_rms ?? 0) >= t * 0.9;
            return (
              <div
                key={i}
                className={`flex-1 rounded-sm ${on ? "bg-foreground" : "bg-foreground/15"}`}
                style={{ height: `${Math.max(20, t * 100)}%` }}
              />
            );
          })}
        </div>
      ) : connection ? (
        <MicOff className="w-4 h-4 text-muted-foreground" />
      ) : (
        <Mic className="w-4 h-4 text-muted-foreground/40" />
      )}
      {connection && onRelease && (
        <button
          onClick={() => onRelease(connection.id)}
          className="text-muted-foreground hover:text-foreground p-1"
          aria-label="Release slot"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {connection && lit && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
    </div>
  );
}