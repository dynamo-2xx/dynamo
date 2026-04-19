/**
 * Resolve a participant's display label with the standard fallback chain:
 *   entered name → profile display_name → "Speaker {slot}"
 */
export function resolveSpeakerName(opts: {
  entered?: string | null;
  profileName?: string | null;
  slot: number;
}): string {
  const entered = opts.entered?.trim();
  if (entered) return entered;
  const profile = opts.profileName?.trim();
  if (profile) return profile;
  return `Speaker ${opts.slot}`;
}
