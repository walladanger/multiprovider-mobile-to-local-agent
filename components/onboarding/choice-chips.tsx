import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type Choice<T extends string> = { value: T; label: string; swatch?: string; style?: ViewStyle };

/** Compact single-select chip row used by the onboarding quick pickers. */
export function ChoiceChips<T extends string>({ label, choices, value, onChange, testID }: {
  label: string; choices: Choice<T>[]; value: T; onChange: (value: T) => void; testID?: string;
}) {
  const palette = Colors[useColorScheme() ?? 'light'];
  return (
    <View style={styles.group} testID={testID}>
      <Text variant="labelLarge" style={{ color: palette.text }}>{label}</Text>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {choices.map((choice) => {
          const selected = choice.value === value;
          return (
            <Pressable
              key={choice.value}
              testID={testID ? `${testID}-${choice.value}` : undefined}
              accessibilityRole="radio"
              accessibilityLabel={choice.label}
              accessibilityState={{ selected }}
              onPress={() => onChange(choice.value)}
              style={({ pressed }) => [styles.chip, {
                backgroundColor: selected ? `${palette.tint}22` : palette.surface,
                borderColor: selected ? palette.tint : palette.border,
                opacity: pressed ? 0.8 : 1,
              }, choice.style]}>
              {choice.swatch ? <View style={[styles.swatch, { backgroundColor: choice.swatch }]} /> : null}
              <Text style={[styles.chipLabel, { color: selected ? palette.text : palette.muted }]}>{choice.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { alignItems: 'center', borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 6, minHeight: 36, paddingHorizontal: 12 },
  swatch: { borderRadius: 8, height: 16, width: 16 },
  chipLabel: { fontFamily: Fonts.sans, fontSize: 14, fontWeight: '600' },
});
