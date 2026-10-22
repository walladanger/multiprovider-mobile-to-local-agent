import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { ConnectionErrorText, LoopbackWarning } from '@/components/ui/connection-error-text';
import { isLoopbackServerUrl } from '@/lib/opencode/connection-hints';
import { useConnection } from '@/providers/opencode-contexts';
import { ConnectionProfiles } from '@/components/settings/connection-profiles';
import { formatTimestamp } from '@/lib/opencode/format';
import type { Palette } from './setting-rows';

type ConnectionSectionProps = {
  connection: { status: 'idle' | 'connecting' | 'connected' | 'error'; message: string; checkedAt?: number };
  palette: Palette;
};

export function ConnectionSection({ connection, palette }: ConnectionSectionProps) {
  const { t } = useTranslation();
  const { settings } = useConnection();
  return (
    <View style={styles.section}>
        <ConnectionErrorText message={connection.message} />
        <LoopbackWarning serverUrl={settings.serverUrl} isLoopback={isLoopbackServerUrl} />
        {connection.checkedAt ? <Text variant="bodySmall" style={{ color: palette.muted }}>{t('settings:connection.lastChecked', { time: formatTimestamp(connection.checkedAt) })}</Text> : null}
        <ConnectionProfiles palette={palette} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 14, paddingBottom: 8 },
});
