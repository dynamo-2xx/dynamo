import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Play, X, SkipForward, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CmmQueueRowWithProfile } from "@/hooks/useCmmQueue";

interface Props {
  rows: CmmQueueRowWithProfile[];
  isOwner: boolean;
  meId: string | null;
  onStartNext?: () => void;
  onEndRound?: (outcome: "completed" | "skipped") => void;
  onWithdraw?: (rowId: string) => void;
  busy?: boolean;
}

const initials = (name: string | null) =>
  (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const QueueList = ({ rows, isOwner, meId, onStartNext, onEndRound, onWithdraw, busy }: Props) => {
  const active = rows.find((r) => r.status === "active");
  const waiting = rows.filter((r) => r.status === "waiting");

  if (!active && !waiting.length) {
    return (
      <div className="rounded-2xl border border-border/50 p-6 text-center text-sm text-muted-foreground">
        No challengers yet. Share the topic to bring them in.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {active && (
        <div className="rounded-2xl border-2 border-foreground p-4 space-y-3 bg-foreground/[0.02]">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={active.avatar_url ?? undefined} />
              <AvatarFallback>{initials(active.display_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide">Live now</span>
                <span className="text-sm font-medium truncate">{active.display_name || "Challenger"}</span>
              </div>
              <p className="text-sm font-body mt-1 leading-snug">{active.position_text}</p>
            </div>
          </div>
          {isOwner && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => onEndRound?.("skipped")} disabled={busy}>
                <SkipForward className="w-3.5 h-3.5" /> Skip
              </Button>
              <Button size="sm" className="flex-1" onClick={() => onEndRound?.("completed")} disabled={busy}>
                <Square className="w-3.5 h-3.5" /> End round
              </Button>
            </div>
          )}
        </div>
      )}

      {waiting.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              In queue · {waiting.length}
            </h3>
            {isOwner && !active && (
              <Button size="sm" onClick={onStartNext} disabled={busy}>
                <Play className="w-3.5 h-3.5" /> Start next
              </Button>
            )}
          </div>
          <ul className="space-y-2">
            {waiting.map((r, i) => {
              const mine = r.user_id === meId;
              return (
                <li key={r.id} className={cn(
                  "rounded-xl border border-border/50 p-3 flex gap-3",
                  mine && "border-foreground/40 bg-foreground/[0.02]",
                )}>
                  <div className="text-xs font-medium text-muted-foreground w-5 mt-1">{i + 1}</div>
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarImage src={r.avatar_url ?? undefined} />
                    <AvatarFallback>{initials(r.display_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {r.display_name || "Challenger"} {mine && <span className="text-xs text-muted-foreground">(you)</span>}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{r.position_text}</p>
                  </div>
                  {mine && (
                    <button
                      onClick={() => onWithdraw?.(r.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors self-start"
                      aria-label="Withdraw"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default QueueList;