/**
 * §7 Mobile — iOS audio unlock. Safari blocks `AudioContext` and media
 * autoplay until a user gesture. Call `armAudioUnlock()` once at app boot to
 * attach a one-shot listener; call `playUnlocked(src)` for chimes that should
 * only fire after the first interaction.
 */
let unlocked = false;
let ctx: AudioContext | null = null;

export function isAudioUnlocked() {
  return unlocked;
}

export function armAudioUnlock() {
  if (typeof window === "undefined" || unlocked) return;
  const handler = async () => {
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AC) {
        ctx = new AC();
        // Play a 1-sample silent buffer to satisfy Safari.
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      }
      unlocked = true;
    } catch {}
    window.removeEventListener("pointerdown", handler);
    window.removeEventListener("keydown", handler);
    window.removeEventListener("touchstart", handler);
  };
  window.addEventListener("pointerdown", handler, { once: true });
  window.addEventListener("keydown", handler, { once: true });
  window.addEventListener("touchstart", handler, { once: true });
}

export async function playUnlocked(src: string) {
  if (!unlocked) return;
  try {
    const a = new Audio(src);
    a.volume = 0.5;
    await a.play();
  } catch {}
}

/**
 * §8 — Celebration / grace chime. Synthesized in WebAudio so it ships with no
 * binary asset. Two short ascending tones (C5 → G5) with soft envelope.
 */
export async function playChime(kind: "celebration" | "grace" = "celebration") {
  if (!unlocked) return;
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    if (!ctx || ctx.state === "closed") ctx = new AC();
    if (ctx.state === "suspended") await ctx.resume();
    const now = ctx.currentTime;
    const notes = kind === "celebration" ? [523.25, 659.25, 783.99] : [659.25, 523.25];
    notes.forEach((freq, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      const t0 = now + i * 0.14;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.18, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
      o.connect(g);
      g.connect(ctx!.destination);
      o.start(t0);
      o.stop(t0 + 0.34);
    });
  } catch {}
}