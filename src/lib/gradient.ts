// Deterministic gradient generation from a string seed.
// Used for profile banner fallback and debate card fallback.

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function gradientFromSeed(seed: string): string {
  const h = hashString(seed || "default");
  const hue1 = h % 360;
  const hue2 = (hue1 + 40 + (h % 60)) % 360;
  // Soft, brand-aligned: low saturation, medium lightness
  return `linear-gradient(135deg, hsl(${hue1}, 35%, 78%) 0%, hsl(${hue2}, 40%, 62%) 100%)`;
}

export function monoGradientFromSeed(seed: string): string {
  const h = hashString(seed || "default");
  const hue = h % 360;
  return `linear-gradient(135deg, hsl(${hue}, 18%, 88%) 0%, hsl(${hue}, 22%, 70%) 50%, hsl(0, 0%, 12%) 100%)`;
}
