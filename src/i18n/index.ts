import en from "./en-US.json";

type Dict = Record<string, string>;
const dictionaries: Record<string, Dict> = { "en-US": en as Dict };

const DEFAULT_LOCALE = "en-US";

const interpolate = (template: string, vars?: Record<string, string | number>) => {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
};

/**
 * §14 i18n: lookup translated string with `{var}` interpolation.
 * Falls back to en-US, then to the key itself, and emits a missing-key console warning
 * (PostHog hook point for future `i18n_missing_key` event).
 */
export const t = (
  key: string,
  vars?: Record<string, string | number>,
  locale: string = DEFAULT_LOCALE,
): string => {
  const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
  const fallback = dictionaries[DEFAULT_LOCALE];
  const raw = dict[key] ?? fallback[key];
  if (raw === undefined) {
    if (typeof window !== "undefined") {
      console.warn(`[i18n] missing key: ${key} (${locale})`);
      (window as any).__dynamoMissingI18nKey?.(key, locale);
    }
    return key;
  }
  return interpolate(raw, vars);
};

export const plural = (
  count: number,
  forms: { one: string; other: string },
): string => (count === 1 ? forms.one : forms.other);

/**
 * React hook returning a t() bound to the user's locale.
 * Reads `profiles.locale` indirectly via AuthContext — defaults to en-US until wired.
 */
export const useT = () => {
  // Lazy AuthContext usage avoids a hard dep cycle on first import
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useAuth } = require("@/contexts/AuthContext");
  const { profile } = useAuth();
  const locale = (profile as any)?.locale ?? DEFAULT_LOCALE;
  return (key: string, vars?: Record<string, string | number>) => t(key, vars, locale);
};