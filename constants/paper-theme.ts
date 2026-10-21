import {
  MD3DarkTheme,
  MD3LightTheme,
  type MD3Theme,
} from 'react-native-paper';

import { Colors } from '@/constants/theme';

export function getPaperTheme(colorScheme: 'light' | 'dark'): MD3Theme {
  const palette = Colors[colorScheme];
  const base = colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme;

  return {
    ...base,
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
