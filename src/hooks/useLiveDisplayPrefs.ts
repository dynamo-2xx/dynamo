import { useCallback, useEffect, useState } from "react";

export type LayoutPreset = "stacked" | "side-by-side" | "transcript-first" | "video-only";
export type TileStyle = "grid" | "speaker-focus" | "compact";
export type TranscriptDensity = "comfortable" | "compact" | "cinema";
export type ThemeOverride = "auto" | "light" | "dark" | "high-contrast";

export interface LiveDisplayPrefs {
  layout: LayoutPreset;
  tileStyle: TileStyle;
  density: TranscriptDensity;
  showTimestamps: boolean;
  showTileLabels: boolean;
  showInterim: boolean;
  groupBySubtopic: boolean;
  theme: ThemeOverride;
}

const DEFAULTS: LiveDisplayPrefs = {
  layout: "stacked",
  tileStyle: "grid",
  density: "comfortable",
  showTimestamps: true,
  showTileLabels: true,
  showInterim: true,
  groupBySubtopic: true,
  theme: "auto",
};

const KEY = "dynamo:live:display-prefs";

export function useLiveDisplayPrefs() {
  const [prefs, setPrefs] = useState<LiveDisplayPrefs>(() => {
    if (typeof window === "undefined") return DEFAULTS;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return DEFAULTS;
      return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      return DEFAULTS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  const update = useCallback(<K extends keyof LiveDisplayPrefs>(key: K, value: LiveDisplayPrefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  }, []);

  const reset = useCallback(() => setPrefs(DEFAULTS), []);

  return { prefs, update, reset };
}

/** CSS class for the theme override wrapper (scoped to the live panel). */
export function themeWrapperClass(theme: ThemeOverride): string {
  switch (theme) {
    case "light":
      return "[color-scheme:light] bg-white text-black";
    case "dark":
      return "dark [color-scheme:dark] bg-neutral-950 text-neutral-50";
    case "high-contrast":
      return "bg-black text-white [&_*]:border-white/40";
    default:
      return "";
  }
}
