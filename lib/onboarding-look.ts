/** Pure option lists for the onboarding Look & feel and Background steps. */
import type { UiFontId } from '@/lib/backgrounds/fonts';
import type { SkinId } from '@/lib/backgrounds/skins';

export const ONBOARDING_FONTS: readonly UiFontId[] = ['system', 'inter', 'manrope', 'ibmPlexSans'];
export const ONBOARDING_TEXT_SIZES = [
  { id: 'small', scale: 0.9 },
  { id: 'medium', scale: 1 },
  { id: 'large', scale: 1.15 },
  { id: 'xlarge', scale: 1.3 },
] as const;
export type TextSizeId = (typeof ONBOARDING_TEXT_SIZES)[number]['id'];

/** Nearest preset for a stored scale, so the chips reflect the current setting. */
export function textSizeIdForScale(scale: number): TextSizeId {
  return ONBOARDING_TEXT_SIZES.reduce((best, size) => Math.abs(size.scale - scale) < Math.abs(best.scale - scale) ? size : best).id;
}

export const ONBOARDING_SKINS: readonly SkinId[] = ['glass', 'solid', 'crisp', 'compact'];

/** Gradient presets: [colorBack, colorB, colorA] from dark base to bright highlight. */
export const GRADIENT_PRESETS = [
  { id: 'indigo', colorBack: '#0b0a2a', colorB: '#1a1446', colorA: '#6d5cff' },
  { id: 'ocean', colorBack: '#040d20', colorB: '#0c1f45', colorA: '#3b82f6' },
  { id: 'aurora', colorBack: '#031514', colorB: '#0e7c74', colorA: '#5fe3d2' },
  { id: 'orchid', colorBack: '#170515', colorB: '#6a1450', colorA: '#f0abfc' },
  { id: 'sunset', colorBack: '#150806', colorB: '#7a2412', colorA: '#ffa07a' },
] as const;
export type GradientPresetId = (typeof GRADIENT_PRESETS)[number]['id'] | 'custom';

/** Highlight colors for the single-color picker (replaces colorA only). */
export const HIGHLIGHT_COLORS = ['#6d5cff', '#3b82f6', '#5fe3d2', '#22c55e', '#f0abfc', '#ffa07a', '#facc15'] as const;

export function gradientPresetId(settings: { kind: string; colorA: string; colorB: string; colorBack: string }): GradientPresetId {
  if (settings.kind !== 'gradient') return 'custom';
  const lower = (v: string) => v.toLowerCase();
  return GRADIENT_PRESETS.find((p) => lower(p.colorBack) === lower(settings.colorBack) && lower(p.colorB) === lower(settings.colorB))?.id ?? 'custom';
}
