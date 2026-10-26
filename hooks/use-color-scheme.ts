import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { getThemeTokensVersion, subscribeThemeTokens } from '@/theme/tokens';

export function useColorScheme(): 'light' | 'dark' {
  // Re-render consumers when a color theme is applied at runtime.
  useSyncExternalStore(subscribeThemeTokens, getThemeTokensVersion, getThemeTokensVersion);
  return useRNColorScheme() === 'dark' ? 'dark' : 'light';
}
