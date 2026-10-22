import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Text } from 'react-native-paper';

import { useOnboardingNavigation } from '@/components/onboarding/use-onboarding-navigation';
import { OnboardingStep } from '@/components/onboarding/onboarding-step';
import { OnboardingHelp } from '@/components/onboarding/onboarding-help';
import { ConnectionSetupForm } from '@/components/settings/connection-setup-form';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function OnboardingConnectScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useOnboardingNavigation('connect');
  const palette = Colors[useColorScheme() ?? 'light'];
  const [busy, setBusy] = useState(false);
  return <OnboardingStep step="connect" title={t('settings:connection.addConnection')} subtitle={t('onboarding:connect.guidance')} testID="onboarding-connect" backDisabled={busy} footer={
    <Button disabled={busy} testID="onboarding-connect-skip" onPress={navigation.next}>{t('onboarding:connect.skip')}</Button>
  }>
    <OnboardingHelp testID="onboarding-connect-help" summary={t('onboarding:help.connect.summary')} details={t('onboarding:help.connect.details', { returnObjects: true }) as string[]} />
    <ConnectionSetupForm onBusyChange={setBusy} onConnected={() => router.push('/onboarding/ai')} />
    <Text testID="onboarding-connect-skip-hint" variant="bodySmall" style={{ color: palette.muted }}>{t('onboarding:connect.skipHint')}</Text>
  </OnboardingStep>;
}
