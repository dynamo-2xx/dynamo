import { Sliders } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  LiveDisplayPrefs,
  LayoutPreset,
  TileStyle,
  TranscriptDensity,
  ThemeOverride,
} from "@/hooks/useLiveDisplayPrefs";

interface Props {
  prefs: LiveDisplayPrefs;
  update: <K extends keyof LiveDisplayPrefs>(key: K, value: LiveDisplayPrefs[K]) => void;
}

const SegRow = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) => (
  <div className="flex flex-wrap gap-1">
    {options.map((o) => (
      <button
        key={o.value}
        onClick={() => onChange(o.value)}
        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors border ${
          value === o.value
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background/50 text-foreground border-foreground/10 hover:border-foreground/30"
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const Toggle = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer">
    <span className="text-xs text-foreground">{label}</span>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-8 h-[18px] rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-foreground/20"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-[2px] left-[2px] w-3.5 h-3.5 rounded-full bg-background transition-transform ${
          checked ? "translate-x-[14px]" : ""
        }`}
      />
    </button>
  </label>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{title}</p>
    {children}
  </div>
);

const DisplayOptionsMenu = ({ prefs, update }: Props) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Display options"
          className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full border border-foreground/10 bg-background/70 backdrop-blur-md hover:bg-background transition-colors"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[280px] p-4 rounded-2xl border-foreground/10 bg-background/85 backdrop-blur-xl shadow-2xl space-y-4"
      >
        <Section title="Layout">
          <SegRow<LayoutPreset>
            value={prefs.layout}
            onChange={(v) => update("layout", v)}
            options={[
              { value: "stacked", label: "Stacked" },
              { value: "side-by-side", label: "Side" },
              { value: "transcript-first", label: "Transcript" },
              { value: "video-only", label: "Video only" },
            ]}
          />
        </Section>

        <Section title="Tile style">
          <SegRow<TileStyle>
            value={prefs.tileStyle}
            onChange={(v) => update("tileStyle", v)}
            options={[
              { value: "grid", label: "Grid" },
              { value: "speaker-focus", label: "Focus" },
              { value: "compact", label: "Compact" },
            ]}
          />
        </Section>

        <Section title="Transcript density">
          <SegRow<TranscriptDensity>
            value={prefs.density}
            onChange={(v) => update("density", v)}
            options={[
              { value: "comfortable", label: "Comfy" },
              { value: "compact", label: "Compact" },
              { value: "cinema", label: "Cinema" },
            ]}
          />
        </Section>

        <Section title="Show / hide">
          <div className="space-y-0.5">
            <Toggle
              label="Timestamps"
              checked={prefs.showTimestamps}
              onChange={(v) => update("showTimestamps", v)}
            />
            <Toggle
              label="Tile name labels"
              checked={prefs.showTileLabels}
              onChange={(v) => update("showTileLabels", v)}
            />
            <Toggle
              label="Live interim text"
              checked={prefs.showInterim}
              onChange={(v) => update("showInterim", v)}
            />
            <Toggle
              label="Group by subtopic"
              checked={prefs.groupBySubtopic}
              onChange={(v) => update("groupBySubtopic", v)}
            />
          </div>
        </Section>

        <Section title="Theme (this session)">
          <SegRow<ThemeOverride>
            value={prefs.theme}
            onChange={(v) => update("theme", v)}
            options={[
              { value: "auto", label: "Auto" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
              { value: "high-contrast", label: "Hi-Con" },
            ]}
          />
        </Section>
      </PopoverContent>
    </Popover>
  );
};

export default DisplayOptionsMenu;
