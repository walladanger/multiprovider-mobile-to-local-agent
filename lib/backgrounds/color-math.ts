/** Small pure color helpers used to derive our defaults from reference looks. */
export function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255; const g = ((n >> 8) & 255) / 255; const b = (n & 255) / 255;
  const max = Math.max(r, g, b); const min = Math.min(r, g, b); const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

export function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${[f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Rotates hue by `deg`. Near-neutral colors (white/black/grey) have no hue to rotate,
 * so they get a faint tint at the rotated hue instead (saturation `neutralTint`).
 */
export function hueShift(hex: string, deg: number, neutralTint = 0.35): string {
  const [h, s, l] = hexToHsl(hex);
  const nh = ((h + deg) % 360 + 360) % 360;
  if (s < 0.05) return hslToHex(nh, l > 0.9 || l < 0.1 ? neutralTint : s + neutralTint, l > 0.97 ? 0.92 : l < 0.03 ? 0.04 : l);
  return hslToHex(nh, s, l);
}

export function hueDistance(a: string, b: string) {
  const d = Math.abs(hexToHsl(a)[0] - hexToHsl(b)[0]) % 360;
  return Math.min(d, 360 - d);
}
