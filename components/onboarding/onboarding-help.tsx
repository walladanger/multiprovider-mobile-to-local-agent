import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Plain-language guidance for an onboarding step: a short always-visible
 * summary plus a collapsed "What's this?" expander with more detail.
 */
export function OnboardingHelp({ summary, details, testID }: { summary: string; details: string[]; testID?: string }) {
  const { t } = useTranslation();
  const palette = Colors[useColorScheme() ?? 'light'];
  const [open, setOpen] = useState(false);
  return (
    <View testID={testID} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.row}>
        <MaterialCommunityIcons name="information-outline" size={18} color={palette.tint} />
        <Text variant="bodyMedium" style={[styles.flex, { color: palette.text }]}>{summary}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        testID={testID ? `${testID}-toggle` : undefined}
        onPress={() => setOpen((value) => !value)}
        style={styles.row}>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={palette.tint} />
        <Text variant="labelLarge" style={{ color: palette.tint }}>{t(open ? 'onboarding:help.hide' : 'onboarding:help.whatsThis')}</Text>
      </Pressable>
      {open ? details.map((line, index) => (
        <Text key={index} variant="bodySmall" style={{ color: palette.muted }}>{line}</Text>
      )) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, gap: 8, padding: 14 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
