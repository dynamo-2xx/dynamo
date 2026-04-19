import type { LiveParticipant } from "@/hooks/useLiveSessionPresence";

interface Props {
  participants: LiveParticipant[];
  speakingDeviceIds?: Set<string>;
}

const PresenceList = ({ participants, speakingDeviceIds }: Props) => {
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
          </div>
        );
      })}
    </div>
  );
};

export default PresenceList;
