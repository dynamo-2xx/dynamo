import type { LiveParticipant } from "@/hooks/useLiveSessionPresence";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

interface Props {
  participants: LiveParticipant[];
  speakingDeviceIds?: Set<string>;
  /** Host-only: shows an evict (×) button on each participant chip. */
  isHost?: boolean;
  /** Required when isHost. Used to call evict_live_participant RPC. */
  sessionId?: string | null;
}

const PresenceList = ({ participants, speakingDeviceIds, isHost, sessionId }: Props) => {
  const [evicting, setEvicting] = useState<string | null>(null);

  const handleEvict = async (deviceId: string, name: string) => {
    if (!sessionId) return;
    if (!window.confirm(`Remove ${name} from this session?`)) return;
    setEvicting(deviceId);
    const { error } = await (supabase as any).rpc("evict_live_participant", {
      _session_id: sessionId,
      _device_id: deviceId,
    });
    setEvicting(null);
    if (error) {
      toast({ title: "Couldn't remove participant", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Participant removed" });
    }
  };

  if (participants.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic px-1">
        Waiting for people to join…
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {participants.map((p) => {
        const speaking = speakingDeviceIds?.has(p.device_id);
        const initials = (p.display_name || "?")
          .split(/\s+/)
          .map((s) => s[0])
          .filter(Boolean)
          .slice(0, 2)
          .join("")
          .toUpperCase();

        return (
          <div
            key={p.device_id}
            className={`shrink-0 flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition-colors ${
              speaking
                ? "border-primary/60 bg-primary/5"
                : "border-border bg-card"
            }`}
          >
            <div className="relative w-8 h-8 rounded-full bg-muted overflow-hidden flex items-center justify-center">
              {p.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.avatar_url} alt={p.display_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[11px] font-semibold text-foreground">{initials}</span>
              )}
              {speaking && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background animate-pulse" />
              )}
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-semibold text-foreground max-w-[100px] truncate">
                {p.display_name}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                Speaker {p.speaker_slot}
              </span>
            </div>
            {isHost && (
              <button
                type="button"
                disabled={evicting === p.device_id}
                onClick={() => handleEvict(p.device_id, p.display_name || "this participant")}
                className="ml-1 -mr-1 w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50"
                aria-label={`Remove ${p.display_name}`}
                title="Remove from session"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PresenceList;
