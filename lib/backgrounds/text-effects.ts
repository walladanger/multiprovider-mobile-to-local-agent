/**
 * Text & fonts effects (pure). Settings live in AppearanceSettings.text; `resolveTextEffects` turns them
 * into an RN `filter` chain (drop shadows: Android 12+, no-op elsewhere) plus colors, used by both the
 * settings preview and the real chat transcript.
 */
import { mixHex } from './color-math';

export type ShadowMode = 'black' | 'surface';
export type TextEffects = {
  /** Text color override; null = the theme's text color. */
  color: string | null;
  /** Shadow amount 0..1. */
  shadow: number;
  /** Shadow color: plain black, or a darker shade of the surface behind the text. */
  shadowMode: ShadowMode;
  outlineColor: string;
  /** Outline thickness in px, 0..3. */
  outline: number;
  /** Effect mixes 0..1. */
  glow: number;
  gradient: number;
  emboss: number;
};

export const OUTLINE_MAX = 3;
export const DEFAULT_TEXT_EFFECTS: TextEffects = { color: null, shadow: 0, shadowMode: 'black', outlineColor: '#000000', outline: 0, glow: 0, gradient: 0, emboss: 0 };

const isColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
const n01 = (v: unknown, max = 1) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.min(max, Math.max(0, v)) * 100) / 100 : 0);

export function normalizeTextEffects(input: unknown): TextEffects {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<TextEffects>;
  return {
    color: isColor(raw.color) ? raw.color : null,
    shadow: n01(raw.shadow),
    shadowMode: raw.shadowMode === 'surface' ? 'surface' : 'black',
    outlineColor: isColor(raw.outlineColor) ? raw.outlineColor : DEFAULT_TEXT_EFFECTS.outlineColor,
    outline: n01(raw.outline, OUTLINE_MAX),
    glow: n01(raw.glow),
    gradient: n01(raw.gradient),
    emboss: n01(raw.emboss),
  };
}

export type DropShadow = { dropShadow: { offsetX: number; offsetY: number; standardDeviation: number; color: string } };
export type ResolvedText = {
  color: string;
  /** Heading / strong / link colors: the gradient effect sweeps from the text color toward the accent. */
  headingColor: string;
  strongColor: string;
  /** Per-position color for true gradient text in plain RN Text (0 = start, 1 = end). */
  colorAt: (t: number) => string;
  filter: DropShadow[];
};

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.round(a * 100) / 100})`;
};

export function resolveTextEffects(fx: TextEffects, theme: { text: string; surface: string; accent: string }): ResolvedText {
  const color = fx.color ?? theme.text;
  const filter: DropShadow[] = [];
  const ds = (offsetX: number, offsetY: number, standardDeviation: number, c: string): DropShadow => ({ dropShadow: { offsetX, offsetY, standardDeviation, color: c } });
  if (fx.outline > 0) {
    const t = fx.outline;
    filter.push(ds(t, 0, 0, fx.outlineColor), ds(-t, 0, 0, fx.outlineColor), ds(0, t, 0, fx.outlineColor), ds(0, -t, 0, fx.outlineColor));
  }
  if (fx.emboss > 0) filter.push(ds(-1, -1, 0.3, rgba('#ffffff', 0.55 * fx.emboss)), ds(1, 1, 0.6, rgba('#000000', 0.7 * fx.emboss)));
  if (fx.shadow > 0) {
    const base = fx.shadowMode === 'surface' ? mixHex(theme.surface, '#000000', 0.6) : '#000000';
    const o = 1 + 2.5 * fx.shadow;
    filter.push(ds(o, o, 1 + 3 * fx.shadow, rgba(base, 0.35 + 0.55 * fx.shadow)));
  }
  if (fx.glow > 0) filter.push(ds(0, 0, 2 + 6 * fx.glow, rgba(mixHex(color, theme.accent, 0.5), Math.min(1, 0.3 + 0.7 * fx.glow))));
  const g = fx.gradient;
  return {
    color,
    headingColor: mixHex(color, theme.accent, g),
    strongColor: mixHex(color, theme.accent, g * 0.7),
    colorAt: (t) => mixHex(color, theme.accent, g * Math.min(1, Math.max(0, t))),
    filter,
  };
}
