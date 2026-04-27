/**
 * One-shot in-memory handoff for a live MediaStream produced by the
 * pre-flight mic test on /join/:code. The debate room reads it once on
 * mount so the in-person joiner is never re-prompted for permission.
 *
 * Module-scoped (not React state) so the value survives a navigation.
 */
let pending: MediaStream | null = null;

export function setHandoffStream(stream: MediaStream | null) {
  // Stop a previous handoff that nobody picked up.
  if (pending && pending !== stream) {
    try {
      pending.getTracks().forEach((t) => t.stop());
    } catch {
      /* noop */
    }
  }
  pending = stream;
}

export function takeHandoffStream(): MediaStream | null {
  const s = pending;
  pending = null;
  return s;
}