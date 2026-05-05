import { Switch } from "@/components/ui/switch";
import { ShieldQuestion } from "lucide-react";

interface Props {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

/**
 * Live-only toggle. When enabled, joiners on `voice_detect_only` mode are
 * muted client-side (their mic is still off; the room device handles capture
 * with multichannel + diarization). Reduces echo when multiple devices are
 * physically in the same room.
 */
export default function EchoGuardToggle({ value, onChange, disabled }: Props) {
  return (
    <label className="flex items-start gap-3 p-3 border border-border/60 rounded-lg bg-background">
      <ShieldQuestion className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-display text-foreground">Reduce room echo</p>
        <p className="text-[11px] text-muted-foreground font-body mt-0.5 leading-snug">
          Mute joiners marked "use room mic" — the room device will diarize multiple voices.
        </p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} disabled={disabled} />
    </label>
  );
}