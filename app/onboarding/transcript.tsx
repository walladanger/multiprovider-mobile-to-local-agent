import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { OnboardingHelp } from '@/components/onboarding/onboarding-help';
import { OnboardingStep } from '@/components/onboarding/onboarding-step';
import { useOnboardingNavigation } from '@/components/onboarding/use-onboarding-navigation';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TRANSCRIPT_VERBOSITIES } from '@/lib/opencode/transcript';
import { usePreferences } from '@/providers/opencode-contexts';

const ICONS = { basic: 'message-outline', reasoning: 'head-lightbulb-outline', verbose: 'wrench-outline' } as const;

export default function OnboardingTranscriptScreen() {
  const { t } = useTranslation();
  const navigation = useOnboardingNavigation('transcript');
  const palette = Colors[useColorScheme() ?? 'light'];
  const { chatPreferences, updateChatPreferences } = usePreferences();
  const current = chatPreferences.transcriptVerbosity || 'basic';
  return (
    <OnboardingStep step="transcript" title={t('onboarding:transcript.title')} subtitle={t('onboarding:transcript.subtitle')} testID="onboarding-transcript" footer={
      <>
        <Button style={{ marginRight: 'auto' }} testID="onboarding-transcript-skip" onPress={navigation.next}>{t('onboarding:permissions.skip')}</Button>
        <Button mode="contained" testID="onboarding-transcript-continue" onPress={navigation.next}>{t('onboarding:permissions.continue')}</Button>
      </>
    }>
      <OnboardingHelp testID="onboarding-transcript-help" summary={t('onboarding:help.transcript.summary')} details={t('onboarding:help.transcript.details', { returnObjects: true }) as string[]} />
      <View accessibilityRole="radiogroup" style={styles.options}>
        {TRANSCRIPT_VERBOSITIES.map((value) => {
          const selected = value === current;
          return (
            <Pressable key={value} testID={`onboarding-transcript-${value}`} accessibilityRole="radio" accessibilityState={{ selected }}
              accessibilityLabel={`${t(`onboarding:transcript.options.${value}.title`)}. ${t(`onboarding:transcript.options.${value}.body`)}`}
              onPress={() => updateChatPreferences({ transcriptVerbosity: value })}
              style={[styles.card, { backgroundColor: palette.surface, borderColor: selected ? palette.tint : palette.border }]}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name={ICONS[value]} size={22} color={selected ? palette.tint : palette.muted} />
                <Text variant="titleSmall" style={[styles.flex, { color: palette.text }]}>{t(`onboarding:transcript.options.${value}.title`)}</Text>
                <MaterialCommunityIcons name={selected ? 'radiobox-marked' : 'radiobox-blank'} size={20} color={selected ? palette.tint : palette.muted} />
              </View>
              <Text variant="bodyMedium" style={{ color: palette.text }}>{t(`onboarding:transcript.options.${value}.body`)}</Text>
              <Text variant="bodySmall" style={{ color: palette.muted }}>{t(`onboarding:transcript.options.${value}.example`)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text variant="bodySmall" style={{ color: palette.muted }}>{t('onboarding:transcript.later')}</Text>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  options: { gap: 12 },
  card: { borderRadius: 16, borderWidth: 1, gap: 6, padding: 14 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
