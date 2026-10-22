import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Text } from 'react-native-paper';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { classifyConnectionError } from '@/lib/opencode/connection-hints';

/** Short friendly line for a raw connection message (one-line contexts such as headers). */
export function useFriendlyConnectionMessage() {
  const { t } = useTranslation();
  return (message: string) => {
    const kind = classifyConnectionError(message);
    return kind === 'other' ? message : t(`common:connectionErrors.${kind}`);
  };
}

/**
 * Friendly connection error with the raw transport detail behind a
 * "Show details" toggle, so "fetch failed: ConnectException …" stays readable.
 */
export function ConnectionErrorText({ message, testID = 'connection-error' }: { message: string; testID?: string }) {
  const { t } = useTranslation();
  const palette = Colors[useColorScheme() ?? 'light'];
  const [open, setOpen] = useState(false);
  const kind = classifyConnectionError(message);
  if (kind === 'other') return <Text testID={testID} variant="bodyMedium" style={{ color: palette.muted }}>{message}</Text>;
  return (
    <View testID={testID} style={{ gap: 4 }}>
      <Text variant="bodyMedium" style={{ color: palette.text }}>{t(`common:connectionErrors.${kind}`)}</Text>
      <Text variant="bodySmall" style={{ color: palette.muted }}>{t(`common:connectionErrors.${kind}Hint`)}</Text>
      <Pressable testID={`${testID}-toggle`} accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((value) => !value)}>
        <Text variant="labelMedium" style={{ color: palette.tint }}>{t(open ? 'common:connectionErrors.hideDetails' : 'common:connectionErrors.showDetails')}</Text>
      </Pressable>
      {open ? <Text testID={`${testID}-detail`} selectable variant="bodySmall" style={{ color: palette.muted, fontFamily: 'monospace' }}>{message}</Text> : null}
    </View>
  );
}

/** Inline warning shown when a server URL points at the phone itself. */
export function LoopbackWarning({ serverUrl, isLoopback, testID = 'loopback-warning' }: { serverUrl: string; isLoopback: (url: string) => boolean; testID?: string }) {
  const { t } = useTranslation();
  const palette = Colors[useColorScheme() ?? 'light'];
  if (!isLoopback(serverUrl)) return null;
  return (
    <View testID={testID} accessibilityRole="alert" style={{ borderColor: palette.warning, borderWidth: 1, borderRadius: 12, padding: 10 }}>
      <Text variant="bodySmall" style={{ color: palette.warning }}>{t('common:connectionErrors.loopback')}</Text>
    </View>
  );
}
