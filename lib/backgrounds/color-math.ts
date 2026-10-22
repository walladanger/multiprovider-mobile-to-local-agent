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

/**
 * JS twin of the shaders' `finish()` invert: positive mixes toward the inverse color, negative
 * flips the color around grey (hue inverted, brightness kept). Used by the non-shader styles.
 */
export function invertHex(hex: string, amount: number): string {
  if (!amount) return hex;
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const k = Math.min(1, Math.abs(amount));
  const grey2 = ((c[0] + c[1] + c[2]) / 3) * 2;
  const out = c.map((v) => {
    const target = amount > 0 ? 1 - v : Math.min(1, Math.max(0, grey2 - v));
    return v + (target - v) * k;
  });
  return `#${out.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`;
}

export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16); const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}

/** Hex -> [hue 0..360, saturation 0..1, value 0..1] (for the color picker). */
export function hexToHsv(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255; const g = ((n >> 8) & 255) / 255; const b = (n & 255) / 255;
  const max = Math.max(r, g, b); const min = Math.min(r, g, b); const d = max - min;
  let h = 0;
  if (d > 0) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [((h * 60) + 360) % 360, max === 0 ? 0 : d / max, max];
}

export function hsvToHex(h: number, s: number, v: number): string {
  const f = (k: number) => { const x = (k + h / 60) % 6; return v - v * s * Math.max(0, Math.min(x, 4 - x, 1)); };
  return `#${[f(5), f(3), f(1)].map((x) => Math.round(Math.min(1, Math.max(0, x)) * 255).toString(16).padStart(2, '0')).join('')}`;
}

/** Accepts "#abc", "abc", "#aabbcc" or "aabbcc"; returns a lowercase "#aabbcc" or null. */
export function parseHex(input: string): string | null {
  const v = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(v)) return `#${v.split('').map((c) => c + c).join('')}`.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(v)) return `#${v}`.toLowerCase();
  return null;
}

export function rgbBytesToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0')).join('')}`;
}
