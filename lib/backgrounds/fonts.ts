/**
 * Bundled open-license fonts (all SIL Open Font License 1.1, from @expo-google-fonts).
 * Family names here are the keys registered with expo-font (see components/ui/app-fonts.tsx).
 */
export const UI_FONT_IDS = ['system', 'inter', 'manrope', 'spaceGrotesk', 'ibmPlexSans'] as const;
export const CODE_FONT_IDS = ['system', 'jetbrainsMono'] as const;
export type UiFontId = (typeof UI_FONT_IDS)[number];
export type CodeFontId = (typeof CODE_FONT_IDS)[number];

export const FONT_FAMILIES: Record<Exclude<UiFontId | CodeFontId, 'system'>, { regular: string; bold: string; label: string }> = {
  inter: { regular: 'Inter_400Regular', bold: 'Inter_700Bold', label: 'Inter' },
  manrope: { regular: 'Manrope_400Regular', bold: 'Manrope_700Bold', label: 'Manrope' },
  spaceGrotesk: { regular: 'SpaceGrotesk_400Regular', bold: 'SpaceGrotesk_700Bold', label: 'Space Grotesk' },
  ibmPlexSans: { regular: 'IBMPlexSans_400Regular', bold: 'IBMPlexSans_700Bold', label: 'IBM Plex Sans' },
  jetbrainsMono: { regular: 'JetBrainsMono_400Regular', bold: 'JetBrainsMono_700Bold', label: 'JetBrains Mono' },
};

export const TEXT_SCALE_MIN = 0.85;
export const TEXT_SCALE_MAX = 1.3;

export const isUiFontId = (v: unknown): v is UiFontId => typeof v === 'string' && (UI_FONT_IDS as readonly string[]).includes(v);
export const isCodeFontId = (v: unknown): v is CodeFontId => typeof v === 'string' && (CODE_FONT_IDS as readonly string[]).includes(v);

/** App text scale stacks with the OS font scale (RN applies the OS scale on top of fontSize). */
export function scaledFontSize(base: number, appScale: number) {
  const s = Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, appScale));
  return Math.round(base * s * 10) / 10;
}
