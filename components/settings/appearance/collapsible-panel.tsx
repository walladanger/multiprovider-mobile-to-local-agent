import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { Icon } from '@/components/ui/icon';
import type { Palette } from '@/components/settings/sections/setting-rows';

/** A collapsible settings panel with a small info button that reveals a one-line explanation. */
export function CollapsiblePanel({ title, info, palette, children, defaultOpen = false, testID }: {
  title: string; info: string; palette: Palette; children: ReactNode; defaultOpen?: boolean; testID?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const [showInfo, setShowInfo] = useState(false);
  return (
    <View style={[styles.panel, { borderColor: palette.border, backgroundColor: palette.surface }]} testID={testID}>
      <View style={styles.header}>
        <Pressable style={styles.titleButton} accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((v) => !v)} testID={testID ? `${testID}-toggle` : undefined}>
          <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}><Icon name="chevron-right" size={18} color={palette.muted} /></View>
          <Text variant="titleSmall" style={{ color: palette.text }}>{title}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('settings:appearance.info', { value: title })} hitSlop={10} onPress={() => setShowInfo((v) => !v)} style={styles.info}>
          <Icon name="help" size={16} color={showInfo ? palette.tint : palette.muted} />
        </Pressable>
      </View>
      {showInfo ? <Text variant="bodySmall" style={{ color: palette.muted }}>{info}</Text> : null}
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 14, borderWidth: 1, gap: 6, paddingHorizontal: 12, paddingVertical: 10 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  titleButton: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 6, minHeight: 32 },
  info: { padding: 4 },
  body: { gap: 12, paddingTop: 6 },
});
