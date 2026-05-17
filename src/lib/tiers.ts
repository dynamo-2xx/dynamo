/**
 * §12 Monetization — tier definitions, Free caps, and helpers.
 * Caps are placeholders until the §18 cost pass locks final numbers; they're
 * deliberately generous so existing users aren't suddenly walled.
 */
export type Tier = "free" | "pro" | "education" | "civic";

export type UsageMetric =
  | "sessions_created"
  | "notebooks_created"
  | "ai_calls"
  | "import_minutes";

export interface TierCaps {
  sessions_created: number;
  notebooks_created: number;
  ai_calls: number;
  import_minutes: number;
}

// Infinity = unlimited
export const TIER_CAPS: Record<Tier, TierCaps> = {
  free: {
    sessions_created: 10,
    notebooks_created: 20,
    ai_calls: 100,
    import_minutes: 30,
  },
  pro: {
    sessions_created: Infinity,
    notebooks_created: Infinity,
    ai_calls: 2000,
    import_minutes: 600,
  },
  education: {
    sessions_created: Infinity,
    notebooks_created: Infinity,
    ai_calls: Infinity,
    import_minutes: Infinity,
  },
  civic: {
    sessions_created: Infinity,
    notebooks_created: Infinity,
    ai_calls: Infinity,
    import_minutes: Infinity,
  },
};

export const TIER_LABEL: Record<Tier, string> = {
  free: "Free",
  pro: "Pro",
  education: "Education",
  civic: "Civic",
};

export function metricLabel(m: UsageMetric): string {
  switch (m) {
    case "sessions_created": return "sessions";
    case "notebooks_created": return "notebooks";
    case "ai_calls": return "AI calls";
    case "import_minutes": return "import minutes";
  }
}

export function isAtCap(used: number, cap: number): boolean {
  return used >= cap;
}