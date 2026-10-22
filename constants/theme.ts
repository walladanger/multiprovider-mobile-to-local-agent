import { Platform } from 'react-native';

import { glass, palette, subscribeThemeTokens, typography } from '@/theme/tokens';

// Derived from theme/tokens.ts (the single theme file). Both schemes use the
// glass theme; `background` is transparent so MotionBackground shows through,
// and `backgroundSolid` is for surfaces that must stay opaque. Rebuilt in place
// whenever a color theme is applied (see applyThemeTokens).
function buildColors() {
  return {
    text: palette.text,
    background: 'transparent',
    backgroundSolid: palette.bg,
    surface: glass.panel,
    surfaceAlt: glass.panelAlt,
    surfaceSolid: palette.bgRaised,
    // Sheets, dialogs and full-screen modals are always opaque so the screen
    // behind never shows through, whatever the skin (Glass stays for in-page cards).
    sheet: palette.bgRaised,
    modalBackground: palette.bg,
    scrim: 'rgba(0, 0, 0, 0.6)',
    card: glass.panel,
    tint: palette.primarySoft,
    accent: palette.accent,
    muted: palette.textMuted,
    border: glass.border,
    icon: palette.icon,
    success: palette.success,
    warning: palette.warning,
    danger: palette.danger,
    bubbleUser: palette.primary,
    onBubbleUser: palette.onPrimary,
    bubbleAssistant: glass.panel,
    onBubbleAssistant: palette.text,
    tabBackground: glass.panelStrong,
    tabIconDefault: palette.icon,
    tabIconSelected: palette.primarySoft,
  };
}

export const Colors = {
  light: buildColors(),
  dark: buildColors(),
};


export const Fonts = Platform.select({
  ios: {
    sans: 'Avenir Next',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
    display: 'Avenir Next',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
    display: 'normal',
  },
  web: {
    sans: "'Avenir Next', 'Segoe UI', 'Trebuchet MS', sans-serif",
    serif: "Charter, 'Iowan Old Style', Georgia, serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    display: "'Avenir Next', 'Segoe UI', 'Trebuchet MS', sans-serif",
  },
});

const platformFonts = { ...Fonts };

// Keep Colors and Fonts in sync with live theme / font changes from Settings > Appearance.
subscribeThemeTokens(() => {
  Object.assign(Colors.light, buildColors());
  Object.assign(Colors.dark, buildColors());
  Object.assign(Fonts, {
    sans: typography.sans ?? platformFonts.sans,
    display: typography.sansBold ?? platformFonts.display,
    rounded: typography.sans ?? platformFonts.rounded,
    mono: typography.mono ?? platformFonts.mono,
  });
});
