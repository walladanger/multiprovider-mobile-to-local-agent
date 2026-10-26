/**
 * Single source of truth for UI colors and design tokens (indigo glass theme).
 * Mirrored as CSS variables in global.css for NativeWind / React Native Reusables.
 * Swap the UI kit later by editing only this file and global.css.
 */
export const palette = {
  bgDeep: '#0b0a2a',
  bg: '#120f38',
  bgRaised: '#1a1446',
  primary: '#6d5cff',
  primarySoft: '#8f82ff',
  onPrimary: '#ffffff',
  accent: '#a78bfa',
  text: '#ece9ff',
  textMuted: '#a9a3d6',
  icon: '#9a93cc',
  success: '#5ee0b0',
  warning: '#f2c46b',
  danger: '#ff7a90',
} as const;

export const glass = {
  /** Translucent indigo panel fill. */
  panel: 'rgba(36, 28, 96, 0.55)',
  panelStrong: 'rgba(30, 24, 82, 0.78)',
  panelAlt: 'rgba(109, 92, 255, 0.16)',
  border: 'rgba(255, 255, 255, 0.10)',
  borderStrong: 'rgba(255, 255, 255, 0.18)',
  blurIntensity: 40,
  blurTint: 'dark' as const,
} as const;

export const overlay = {
  /** Tint drawn over the motion background so content stays readable. */
  tint: 'rgba(11, 10, 42, 0.62)',
  gradient: ['#0b0a2a', '#1a1446', '#2a1d6b'] as const,
} as const;

export const radius = { sm: 8, md: 12, lg: 18, xl: 24 } as const;

export const tokens = { palette, glass, overlay, radius } as const;
export type Tokens = typeof tokens;
