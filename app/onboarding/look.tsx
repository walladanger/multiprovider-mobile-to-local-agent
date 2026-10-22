import { useTranslation } from 'react-i18next';
import { Button, Text } from 'react-native-paper';

import { ChoiceChips } from '@/components/onboarding/choice-chips';
import { LookPreview } from '@/components/onboarding/look-preview';
import { OnboardingHelp } from '@/components/onboarding/onboarding-help';
import { OnboardingStep } from '@/components/onboarding/onboarding-step';
import { useOnboardingNavigation } from '@/components/onboarding/use-onboarding-navigation';
import { LANGUAGE_OPTIONS } from '@/components/settings/settings-utils';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { COLOR_THEME_IDS, COLOR_THEMES } from '@/lib/backgrounds/color-themes';
import { FONT_FAMILIES } from '@/lib/backgrounds/fonts';
import { ONBOARDING_FONTS, ONBOARDING_TEXT_SIZES, textSizeIdForScale } from '@/lib/onboarding-look';
import { useBackground } from '@/providers/background-context';
import { usePreferences } from '@/providers/opencode-contexts';

export default function OnboardingLookScreen() {
  const { t } = useTranslation();
  const navigation = useOnboardingNavigation('look');
  const palette = Colors[useColorScheme() ?? 'light'];
  const { chatPreferences, updateChatPreferences } = usePreferences();
  const { appearance, settings, updateAppearance, selectTheme } = useBackground();
  return (
    <OnboardingStep step="look" title={t('onboarding:look.title')} subtitle={t('onboarding:look.subtitle')} testID="onboarding-look" footer={
      <>
        <Button style={{ marginRight: 'auto' }} testID="onboarding-look-skip" onPress={navigation.next}>{t('onboarding:permissions.skip')}</Button>
        <Button mode="contained" testID="onboarding-look-continue" onPress={navigation.next}>{t('onboarding:permissions.continue')}</Button>
      </>
    }>
      <LookPreview background={settings} skinId={appearance.skinId} />
      <OnboardingHelp testID="onboarding-look-help" summary={t('onboarding:help.look.summary')} details={t('onboarding:help.look.details', { returnObjects: true }) as string[]} />
      <ChoiceChips testID="onboarding-look-language" label={t('settings:language.title')} value={chatPreferences.language ?? 'system'}
        choices={[{ value: 'system', label: t('common:labels.systemDefault') }, ...LANGUAGE_OPTIONS]}
        onChange={(value) => updateChatPreferences({ language: value === 'system' ? undefined : value })} />
      <ChoiceChips testID="onboarding-look-font" label={t('settings:backgrounds.fonts.ui')} value={appearance.uiFont}
        choices={ONBOARDING_FONTS.map((id) => ({ value: id, label: id === 'system' ? t('settings:backgrounds.fonts.system') : FONT_FAMILIES[id].label }))}
        onChange={(uiFont) => updateAppearance({ uiFont })} />
      <ChoiceChips testID="onboarding-look-size" label={t('settings:backgrounds.fonts.textSize')} value={textSizeIdForScale(appearance.textScale)}
        choices={ONBOARDING_TEXT_SIZES.map((size) => ({ value: size.id, label: t(`onboarding:look.sizes.${size.id}`) }))}
        onChange={(id) => updateAppearance({ textScale: ONBOARDING_TEXT_SIZES.find((size) => size.id === id)?.scale ?? 1 })} />
      <ChoiceChips testID="onboarding-look-accent" label={t('onboarding:look.accent')} value={appearance.themeId}
        choices={COLOR_THEME_IDS.map((id) => ({ value: id, label: t(`settings:backgrounds.theme.names.${id}`), swatch: COLOR_THEMES[id].primarySoft }))}
        onChange={selectTheme} />
      <Text testID="onboarding-look-later" variant="bodySmall" style={{ color: palette.muted }}>{t('onboarding:look.later')}</Text>
    </OnboardingStep>
  );
}
