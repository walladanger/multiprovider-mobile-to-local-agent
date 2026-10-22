import { useTranslation } from 'react-i18next';
import { Button, Text } from 'react-native-paper';

import { ChoiceChips } from '@/components/onboarding/choice-chips';
import { LookPreview } from '@/components/onboarding/look-preview';
import { OnboardingHelp } from '@/components/onboarding/onboarding-help';
import { OnboardingStep } from '@/components/onboarding/onboarding-step';
import { useOnboardingNavigation } from '@/components/onboarding/use-onboarding-navigation';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BACKGROUND_DEFAULTS } from '@/lib/backgrounds/settings';
import { GRADIENT_PRESETS, HIGHLIGHT_COLORS, ONBOARDING_SKINS, gradientPresetId } from '@/lib/onboarding-look';
import { useBackground } from '@/providers/background-context';

export default function OnboardingBackgroundScreen() {
  const { t } = useTranslation();
  const navigation = useOnboardingNavigation('background');
  const palette = Colors[useColorScheme() ?? 'light'];
  const { appearance, settings, applySettings, update, updateAppearance } = useBackground();
  const preset = gradientPresetId(settings);
  return (
    <OnboardingStep step="background" title={t('onboarding:background.title')} subtitle={t('onboarding:background.subtitle')} testID="onboarding-background" footer={
      <>
        <Button style={{ marginRight: 'auto' }} testID="onboarding-background-skip" onPress={navigation.next}>{t('onboarding:permissions.skip')}</Button>
        <Button mode="contained" testID="onboarding-background-continue" onPress={navigation.next}>{t('onboarding:permissions.continue')}</Button>
      </>
    }>
      <LookPreview testID="onboarding-background-preview" background={settings} skinId={appearance.skinId} />
      <OnboardingHelp testID="onboarding-background-help" summary={t('onboarding:help.background.summary')} details={t('onboarding:help.background.details', { returnObjects: true }) as string[]} />
      <ChoiceChips testID="onboarding-background-gradient" label={t('onboarding:background.gradient')} value={preset}
        choices={GRADIENT_PRESETS.map((p) => ({ value: p.id, label: t(`onboarding:background.presets.${p.id}`), swatch: p.colorA }))}
        onChange={(id) => {
          const p = GRADIENT_PRESETS.find((item) => item.id === id);
          if (p) applySettings({ ...BACKGROUND_DEFAULTS.gradient, colorA: p.colorA, colorB: p.colorB, colorBack: p.colorBack });
        }} />
      <ChoiceChips testID="onboarding-background-color" label={t('onboarding:background.color')} value={settings.colorA.toLowerCase()}
        choices={HIGHLIGHT_COLORS.map((color) => ({ value: color, label: color, swatch: color }))}
        onChange={(colorA) => (settings.kind === 'gradient' ? update({ colorA }) : applySettings({ ...BACKGROUND_DEFAULTS.gradient, colorB: settings.colorB, colorBack: settings.colorBack, colorA }))} />
      <ChoiceChips testID="onboarding-background-skin" label={t('onboarding:background.panel')} value={appearance.skinId}
        choices={ONBOARDING_SKINS.map((id) => ({ value: id, label: t(`settings:backgrounds.skin.names.${id}`) }))}
        onChange={(skinId) => updateAppearance({ skinId })} />
      <Text variant="bodySmall" style={{ color: palette.muted }}>{t(`onboarding:background.skinHints.${appearance.skinId}`)}</Text>
      <Text testID="onboarding-background-later" variant="bodySmall" style={{ color: palette.muted }}>{t('onboarding:background.later')}</Text>
    </OnboardingStep>
  );
}
