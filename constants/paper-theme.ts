import {
  MD3DarkTheme,
  MD3LightTheme,
  type MD3Theme,
} from 'react-native-paper';

import { Colors } from '@/constants/theme';
import { typography } from '@/theme/tokens';

// Applies the Appearance font family and app text scale (stacks with the OS scale).
function themedFonts(base: MD3Theme['fonts']): MD3Theme['fonts'] {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(base)) {
    if (value && typeof value === 'object' && 'fontSize' in value) {
      const bold = Number(value.fontWeight) >= 600;
      const family = (bold ? typography.sansBold : typography.sans) ?? value.fontFamily;
      out[key] = { ...value, fontFamily: family, fontSize: Math.round(value.fontSize * typography.scale * 10) / 10, lineHeight: Math.round(value.lineHeight * typography.scale * 10) / 10 };
    } else {
      out[key] = value;
    }
  }
  return out as MD3Theme['fonts'];
}

export function getPaperTheme(colorScheme: 'light' | 'dark'): MD3Theme {
  const palette = Colors[colorScheme];
  const base = colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme;

  return {
    ...base,
    fonts: themedFonts(base.fonts),
    roundness: 3,
    colors: {
      ...base.colors,
      primary: palette.tint,
      onPrimary: '#FFFFFF',
      primaryContainer: palette.surfaceAlt,
      onPrimaryContainer: palette.text,
      secondary: palette.accent,
      onSecondary: '#0b0a2a',
      secondaryContainer: palette.surfaceAlt,
      onSecondaryContainer: palette.text,
      error: palette.danger,
      background: palette.background,
      onBackground: palette.text,
      surface: palette.surface,
      onSurface: palette.text,
      surfaceVariant: palette.surfaceAlt,
      onSurfaceVariant: palette.muted,
      outline: palette.border,
      outlineVariant: palette.border,
      elevation: {
        ...base.colors.elevation,
        level0: 'transparent',
        level1: palette.surfaceSolid,
        level2: palette.surfaceSolid,
        level3: palette.surfaceSolid,
        level4: palette.surfaceSolid,
        level5: palette.surfaceSolid,
      },
    },
  };
}
