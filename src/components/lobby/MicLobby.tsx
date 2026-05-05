import { ReactNode } from "react";
import LobbySlotRow from "./LobbySlotRow";
import type { MicConnection, SessionKind } from "@/hooks/useMicLobby";
import { useMicLobby } from "@/hooks/useMicLobby";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface SlotDef { key: string; label: string; hint?: string; }

interface Props {
  kind: SessionKind;
  sessionId: string | null;
  slots: SlotDef[];
  minConnected?: number;
  onStart: () => void;
  starting?: boolean;
  startLabel?: string;
  header?: ReactNode;
  footer?: ReactNode;
}

export default function MicLobby({
  kind, sessionId, slots, minConnected = 1, onStart, starting, startLabel = "Start session", header, footer,
}: Props) {
  const { rows, release } = useMicLobby(kind, sessionId);
  const bySlot = new Map<string, MicConnection>();
  rows.forEach((r) => bySlot.set(r.slot_key, r));
  const ready = rows.length >= minConnected;
  return (
    <div className="space-y-4">
      {header}
      <div className="space-y-2">
        {slots.map((s) => (
          <LobbySlotRow key={s.key} slot={s} connection={bySlot.get(s.key) ?? null} onRelease={release} />
        ))}
        {rows.filter((r) => !slots.some((s) => s.key === r.slot_key)).map((r) => (
          <LobbySlotRow key={r.id} slot={{ key: r.slot_key, label: r.display_name }} connection={r} onRelease={release} />
        ))}
      </div>
      <Button onClick={onStart} disabled={!ready || starting} className="w-full">
        <Play className="w-4 h-4 mr-1" />
        {starting ? "Starting…" : startLabel}
      </Button>
      {!ready && (
        <p className="text-[11px] text-muted-foreground font-body text-center">
          Connect at least {minConnected} mic{minConnected !== 1 ? "s" : ""} to start.
        </p>
      )}
      {footer}
    </div>
  );
}