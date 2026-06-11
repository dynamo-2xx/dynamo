import { Check, Loader2 } from "lucide-react";
import { useMicPresence, type SessionKind } from "@/hooks/useMicLobby";

interface Props {
  kind: SessionKind;
  sessionId: string | null;
  title?: string;
}

export default function ParticipantConfirmList({ kind, sessionId, title = "Voice check" }: Props) {
  const { rows } = useMicPresence(kind, sessionId);
  if (!sessionId || rows.length === 0) return null;
  return (
    <div className="border border-border rounded-lg bg-background p-3 space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">{title}</p>
      <div className="space-y-1.5">
        {rows.map((row) => {
          const ok = Boolean(row.voice_confirmed_at);
          return (
            <div key={row.id} className="flex items-center justify-between gap-2 rounded-md bg-accent/40 px-2.5 py-2">
              <div className="flex items-center gap-2 min-w-0">
                {row.avatar_url ? (
                  <img src={row.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-foreground/10 inline-flex items-center justify-center text-[10px] shrink-0">
                    {(row.display_name || "?").slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="text-xs font-body text-foreground truncate">{row.display_name || "Speaker"}</span>
              </div>
              {ok ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}