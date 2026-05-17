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