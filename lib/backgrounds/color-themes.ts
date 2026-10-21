/**
 * Built-in color themes. Each one maps to theme tokens (theme/tokens.ts) and
 * suggests matching colors for the animated backgrounds. Pure module (no RN imports).
 */
import type { BackgroundKind, BackgroundSettings } from './settings';

export const COLOR_THEME_IDS = ['deepIndigo', 'midnightViolet', 'royalPurple', 'abyssBlue', 'nebulaMagenta', 'cosmicTeal', 'emberNight'] as const;
export type ColorThemeId = (typeof COLOR_THEME_IDS)[number];
export const DEFAULT_COLOR_THEME: ColorThemeId = 'deepIndigo';

export type ColorTheme = {
  id: ColorThemeId;
  bgDeep: string; bg: string; bgRaised: string;
  primary: string; primarySoft: string; accent: string;
  text: string; textMuted: string;
  /** Panel tint as r,g,b (alpha comes from the skin). */
  panelRgb: [number, number, number];
  /** Suggested animated-background colors. */
  suggested: { colorA: string; colorB: string; colorBack: string };
};

const t = (id: ColorThemeId, c: Omit<ColorTheme, 'id'>): ColorTheme => ({ id, ...c });

export const COLOR_THEMES: Record<ColorThemeId, ColorTheme> = {
  deepIndigo: t('deepIndigo', { bgDeep: '#0b0a2a', bg: '#120f38', bgRaised: '#1a1446', primary: '#5b4ae8', primarySoft: '#8f82ff', accent: '#a78bfa', text: '#ece9ff', textMuted: '#a9a3d6', panelRgb: [36, 28, 96], suggested: { colorA: '#8f82ff', colorB: '#6d5cff', colorBack: '#0b0a2a' } }),
  midnightViolet: t('midnightViolet', { bgDeep: '#0d0720', bg: '#150c2e', bgRaised: '#1f1240', primary: '#7a3fe0', primarySoft: '#b28cff', accent: '#c4a5ff', text: '#f1eaff', textMuted: '#b3a4d9', panelRgb: [48, 26, 92], suggested: { colorA: '#b28cff', colorB: '#7a3fe0', colorBack: '#0d0720' } }),
  royalPurple: t('royalPurple', { bgDeep: '#130624', bg: '#1c0b33', bgRaised: '#2a1048', primary: '#8e2fc9', primarySoft: '#d39bff', accent: '#e7b6ff', text: '#f6ecff', textMuted: '#c0a6dc', panelRgb: [70, 24, 110], suggested: { colorA: '#d39bff', colorB: '#8e2fc9', colorBack: '#130624' } }),
  abyssBlue: t('abyssBlue', { bgDeep: '#040d20', bg: '#071530', bgRaised: '#0c1f45', primary: '#1f5fd1', primarySoft: '#7fb0ff', accent: '#8fd3ff', text: '#e8f1ff', textMuted: '#9db3d8', panelRgb: [18, 44, 100], suggested: { colorA: '#3b82f6', colorB: '#7fb0ff', colorBack: '#040d20' } }),
  nebulaMagenta: t('nebulaMagenta', { bgDeep: '#170515', bg: '#22081f', bgRaised: '#330c2e', primary: '#b0247e', primarySoft: '#ff8fd0', accent: '#f0abfc', text: '#ffeaf6', textMuted: '#d8a6c6', panelRgb: [96, 20, 80], suggested: { colorA: '#f0abfc', colorB: '#b0247e', colorBack: '#170515' } }),
  cosmicTeal: t('cosmicTeal', { bgDeep: '#031514', bg: '#06201f', bgRaised: '#0b2e2c', primary: '#0e7c74', primarySoft: '#5fe3d2', accent: '#7cf5e4', text: '#e6fffb', textMuted: '#94c9c2', panelRgb: [14, 80, 76], suggested: { colorA: '#5fe3d2', colorB: '#00ffff', colorBack: '#031514' } }),
  emberNight: t('emberNight', { bgDeep: '#150806', bg: '#1f0d0b', bgRaised: '#2e1310', primary: '#b3401f', primarySoft: '#ffa07a', accent: '#ffc29e', text: '#fff0ea', textMuted: '#d6aa9c', panelRgb: [96, 34, 24], suggested: { colorA: '#ffa07a', colorB: '#b3401f', colorBack: '#150806' } }),
};

export function isColorThemeId(v: unknown): v is ColorThemeId {
  return typeof v === 'string' && (COLOR_THEME_IDS as readonly string[]).includes(v);
}

/** Suggested background colors for a theme; the user can override them afterwards. */
export function suggestBackgroundColors(theme: ColorTheme, kind: BackgroundKind): Pick<BackgroundSettings, 'colorA' | 'colorB' | 'colorBack'> {
  if (kind === 'gradient') return { colorA: theme.bgRaised, colorB: theme.bg, colorBack: theme.bgDeep };
  return { ...theme.suggested };
}

// ---- WCAG contrast helpers ----
function channel(v: number) {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function luminance([r, g, b]: [number, number, number]) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
export function contrastRatio(a: [number, number, number], b: [number, number, number]) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
export function blend(top: [number, number, number], alpha: number, base: [number, number, number]): [number, number, number] {
  return [0, 1, 2].map((i) => Math.round(top[i] * alpha + base[i] * (1 - alpha))) as [number, number, number];
}
