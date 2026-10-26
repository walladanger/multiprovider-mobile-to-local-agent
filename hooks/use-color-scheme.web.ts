import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { getThemeTokensVersion, subscribeThemeTokens } from '@/theme/tokens';

const subscribe = () => () => undefined;

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web.
 * `useSyncExternalStore` gives the server snapshot ('light') and the hydrated client snapshot
 * without a state-setting effect.
 */
export function useColorScheme(): 'light' | 'dark' {
  // Re-render consumers when a color theme is applied at runtime.
  useSyncExternalStore(subscribeThemeTokens, getThemeTokensVersion, getThemeTokensVersion);
  const colorScheme = useRNColorScheme();
  const hasHydrated = useSyncExternalStore(subscribe, () => true, () => false);

  if (hasHydrated) {
    return colorScheme === 'dark' ? 'dark' : 'light';
  }

  return 'light';
}
