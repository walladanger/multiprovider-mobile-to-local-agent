/**
 * Appearance = color theme + skin + fonts + text scale + icon pack.
 * Pure model; `resolveThemeTokens` produces the patch applied to theme/tokens.ts.
 */
import { COLOR_THEMES, DEFAULT_COLOR_THEME, isColorThemeId, type ColorThemeId } from './color-themes';
import { isCodeFontId, isUiFontId, TEXT_SCALE_MAX, TEXT_SCALE_MIN, type CodeFontId, type UiFontId } from './fonts';
import { DEFAULT_SKIN, isSkinId, SKINS, type SkinId } from './skins';

export const ICON_PACKS = ['material', 'lucide', 'phosphor', 'tabler'] as const;
export type IconPack = (typeof ICON_PACKS)[number];
const isIconPack = (v: unknown): v is IconPack => typeof v === 'string' && (ICON_PACKS as readonly string[]).includes(v);

export type AppearanceSettings = {
  themeId: ColorThemeId;
  skinId: SkinId;
  uiFont: UiFontId;
  codeFont: CodeFontId;
  textScale: number;
  iconPack: IconPack;
};

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  themeId: DEFAULT_COLOR_THEME, skinId: DEFAULT_SKIN, uiFont: 'system', codeFont: 'system', textScale: 1, iconPack: 'material',
};

export function normalizeAppearance(input: unknown): AppearanceSettings {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<AppearanceSettings>;
  const scale = typeof raw.textScale === 'number' && Number.isFinite(raw.textScale) ? Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, raw.textScale)) : 1;
  return {
    themeId: isColorThemeId(raw.themeId) ? raw.themeId : DEFAULT_APPEARANCE.themeId,
    skinId: isSkinId(raw.skinId) ? raw.skinId : DEFAULT_APPEARANCE.skinId,
    uiFont: isUiFontId(raw.uiFont) ? raw.uiFont : 'system',
    codeFont: isCodeFontId(raw.codeFont) ? raw.codeFont : 'system',
    textScale: Math.round(scale * 100) / 100,
    iconPack: isIconPack(raw.iconPack) ? raw.iconPack : 'material',
  };
}

const rgba = ([r, g, b]: [number, number, number], a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;
const hexRgb = (hex: string): [number, number, number] => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

export const BASE_RADIUS = { sm: 8, md: 12, lg: 18, xl: 24 } as const;
export const BASE_SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export function resolveThemeTokens(appearance: AppearanceSettings) {
  const th = COLOR_THEMES[appearance.themeId];
  const skin = SKINS[appearance.skinId];
  const scale = (o: Record<string, number>, k: number) => Object.fromEntries(Object.entries(o).map(([key, v]) => [key, Math.round(v * k)]));
  return {
    palette: { bgDeep: th.bgDeep, bg: th.bg, bgRaised: th.bgRaised, primary: th.primary, primarySoft: th.primarySoft, accent: th.accent, text: th.text, textMuted: th.textMuted, icon: th.textMuted },
    glass: {
      panel: rgba(th.panelRgb, skin.panelAlpha),
      panelStrong: rgba(th.panelRgb, Math.min(0.95, skin.panelAlpha + 0.25)),
      panelAlt: rgba(hexRgb(th.primary), 0.16),
      border: `rgba(255, 255, 255, ${skin.borderAlpha})`,
      borderStrong: `rgba(255, 255, 255, ${Math.min(0.4, skin.borderAlpha + 0.08)})`,
      blurIntensity: skin.blur ? 40 : 0,
    },
    overlay: { tint: rgba(hexRgb(th.bgDeep), 0.62), gradient: [th.bgDeep, th.bg, th.bgRaised] as [string, string, string] },
    radius: scale(BASE_RADIUS, skin.radiusScale) as Record<keyof typeof BASE_RADIUS, number>,
    spacing: scale(BASE_SPACING, skin.spacingScale) as Record<keyof typeof BASE_SPACING, number>,
  };
}
