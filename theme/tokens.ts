/**
 * Single source of truth for UI colors and design tokens (indigo glass theme).
 * Mirrored as CSS variables in global.css for NativeWind / React Native Reusables.
 * Swap the UI kit later by editing only this file and global.css.
 *
 * The token objects are mutable at runtime: `applyThemeTokens` (used by the
 * built-in color themes in lib/backgrounds/color-themes.ts) updates them in place
 * and notifies subscribers, so `useColorScheme()` consumers re-render live.
 */
export type ThemePalette = {
  bgDeep: string; bg: string; bgRaised: string;
  primary: string; primarySoft: string; onPrimary: string; accent: string;
  text: string; textMuted: string; icon: string;
  success: string; warning: string; danger: string;
};
export type ThemeGlass = {
  panel: string; panelStrong: string; panelAlt: string; border: string; borderStrong: string;
  blurIntensity: number; blurTint: 'dark';
};
export type ThemeOverlay = { tint: string; gradient: [string, string, string] };

export const palette: ThemePalette = {
  bgDeep: '#0b0a2a',
  bg: '#120f38',
  bgRaised: '#1a1446',
  primary: '#5b4ae8',
  primarySoft: '#8f82ff',
  onPrimary: '#ffffff',
  accent: '#a78bfa',
  text: '#ece9ff',
  textMuted: '#a9a3d6',
  icon: '#9a93cc',
  success: '#5ee0b0',
  warning: '#f2c46b',
  danger: '#ff7a90',
};

export const glass: ThemeGlass = {
  /** Translucent panel fill. */
  panel: 'rgba(36, 28, 96, 0.55)',
  panelStrong: 'rgba(30, 24, 82, 0.78)',
  panelAlt: 'rgba(109, 92, 255, 0.16)',
  border: 'rgba(255, 255, 255, 0.10)',
  borderStrong: 'rgba(255, 255, 255, 0.18)',
  blurIntensity: 40,
  blurTint: 'dark',
};

export const overlay: ThemeOverlay = {
  /** Tint drawn over the motion background so content stays readable. */
  tint: 'rgba(11, 10, 42, 0.62)',
  gradient: ['#0b0a2a', '#1a1446', '#2a1d6b'],
};

export const radius = { sm: 8, md: 12, lg: 18, xl: 24 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

/** Font families (undefined = platform default) and the app text scale (stacks with OS scale). */
export const typography: { sans?: string; sansBold?: string; mono?: string; scale: number } = { scale: 1 };

/** Active icon pack used by components/ui/icon.tsx. */
export const iconSettings: { pack: 'material' | 'lucide' | 'phosphor' | 'tabler' } = { pack: 'material' };

export const tokens = { palette, glass, overlay, radius, spacing, typography, iconSettings };
export type Tokens = typeof tokens;

let version = 0;
const listeners = new Set<() => void>();

export type ThemeTokensPatch = {
  palette?: Partial<ThemePalette>;
  glass?: Partial<ThemeGlass>;
  overlay?: Partial<ThemeOverlay>;
  radius?: Partial<typeof radius>;
  spacing?: Partial<typeof spacing>;
  typography?: Partial<typeof typography>;
  iconSettings?: Partial<typeof iconSettings>;
};

export function applyThemeTokens(next: ThemeTokensPatch) {
  Object.assign(palette, next.palette);
  Object.assign(glass, next.glass);
  Object.assign(overlay, next.overlay);
  Object.assign(radius, next.radius);
  Object.assign(spacing, next.spacing);
  if (next.typography) Object.assign(typography, next.typography);
  Object.assign(iconSettings, next.iconSettings);
  version += 1;
  listeners.forEach((l) => l());
}
export function subscribeThemeTokens(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function getThemeTokensVersion() {
  return version;
}
