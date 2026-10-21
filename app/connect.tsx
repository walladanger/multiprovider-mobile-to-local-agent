// Opened by camera-app scans and links: opencodemobile://connect?v=1&type=...
// and https://<pairing host>/connect?v=1&... (Android App Link). The in-app
// scanner flow (components/settings/connection-scan-flow.tsx) is unchanged.
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Appbar, Button, HelperText, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LocalPairingError } from '@/lib/opencode/pairing';
import { CONNECTION_TYPES, DEFAULT_PAIRING_HOST, parseUniversalPairing, PAIRING_SCHEME, UniversalPairingError, type UniversalPairing } from '@/lib/pairing/universal';
import { useConnection } from '@/providers/opencode-contexts';

function rebuildLink(params: Record<string, string | string[] | undefined>) {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
  }
  return `${PAIRING_SCHEME}://connect?${parts.join('&')}`;
}

export default function ConnectScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = Colors[useColorScheme() ?? 'light'];
  const params = useLocalSearchParams();
  const { connectionProfiles } = useConnection();
  const host: string = Constants.expoConfig?.extra?.pairingHost ?? DEFAULT_PAIRING_HOST;
  const link = rebuildLink(params);
  const parsed = useMemo<{ pairing?: UniversalPairing; error?: string }>(() => {
    try {
      return { pairing: parseUniversalPairing(link, [host]) };
    } catch (e) {
      return { error: e instanceof UniversalPairingError ? e.reason : 'invalid' };
    }
  }, [link, host]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const working = useRef(false);
  const pairing = parsed.pairing;
  const def = pairing ? CONNECTION_TYPES[pairing.type] : undefined;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  async function pair() {
    if (!pairing || working.current) return;
    working.current = true;
    setBusy(true);
    setMessage(undefined);
    try {
      const paired = await connectionProfiles.pair(pairing.input);
      const profile = await connectionProfiles.save({ name: '', serverUrl: paired.serverUrl, username: paired.username, password: paired.password });
      const result = await connectionProfiles.connect(profile);
      if (result.status !== 'connected') throw new Error(result.message);
      router.replace('/');
    } catch (reason) {
      setMessage(reason instanceof LocalPairingError
        ? t(`settings:connection.setup.pairingErrors.${reason.reason}`)
        : reason instanceof Error ? reason.message : t('settings:connection.errors.save'));
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <Appbar.Header statusBarHeight={0} style={{ backgroundColor: palette.surface, paddingTop: insets.top, height: 64 + insets.top }}>
        <Appbar.BackAction color={palette.text} accessibilityLabel={t('common:actions.back')} disabled={busy} onPress={close} />
        <Appbar.Content titleStyle={{ color: palette.text }} title={t('settings:universalPairing.title')} />
      </Appbar.Header>
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        {parsed.error ? (
          <HelperText type="error" visible testID="connect-link-error">{t(`settings:universalPairing.errors.${parsed.error}`)}</HelperText>
        ) : def && pairing ? (
          <>
            <Text variant="titleMedium" style={{ color: palette.text }}>{def.label}</Text>
            {/* Show hosts only; never the pairing code or token. */}
            <Text style={{ color: palette.muted }}>{pairing.urls.map((u) => u.replace(/^https?:\/\//, '')).join(', ')}</Text>
            {def.status === 'comingSoon' ? (
              <Text testID="connect-coming-soon" style={{ color: palette.text }}>{t('settings:universalPairing.comingSoon', { type: def.label })}</Text>
            ) : (
              <>
                <Text style={{ color: palette.text }}>{t('settings:universalPairing.confirm')}</Text>
                {message ? <HelperText type="error" visible>{message}</HelperText> : null}
                <View style={styles.actions}>
                  <Button disabled={busy} onPress={close}>{t('common:actions.cancel')}</Button>
                  <Button testID="connect-link-pair" mode="contained" disabled={busy} onPress={() => void pair()}>{t('settings:universalPairing.pair')}</Button>
                </View>
              </>
            )}
            {busy ? <ActivityIndicator /> : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  card: { borderRadius: 16, borderWidth: 1, gap: 10, margin: 16, padding: 16 },
  actions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
});
