/** Text & fonts: font, size, color and text effects, with a live chat preview that streams fake replies. */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text as NativeText, View } from 'react-native';
import { Text } from 'react-native-paper';

import { CollapsiblePanel } from '@/components/settings/appearance/collapsible-panel';
import { ColorRow } from '@/components/settings/appearance/color-picker';
import { ChipRow } from '@/components/settings/sections/background-section';
import type { Palette } from '@/components/settings/sections/setting-rows';
import { NumericSlider } from '@/components/ui/numeric-slider';
import { CODE_FONT_IDS, FONT_FAMILIES, TEXT_SCALE_MAX, TEXT_SCALE_MIN, UI_FONT_IDS } from '@/lib/backgrounds/fonts';
import { OUTLINE_MAX, resolveTextEffects, type TextEffects } from '@/lib/backgrounds/text-effects';
import { useBackground } from '@/providers/background-context';

/** The chat transcript font size lives in chat preferences; the settings screen passes it in. */
export type ChatTextSize = { value: number; min: number; max: number; onChange: (value: number) => void };

export function TextFontsPanel({ palette, chatTextSize }: { palette: Palette; chatTextSize?: ChatTextSize }) {
  const { t } = useTranslation();
  const bg = useBackground();
  const fx = bg.appearance.text;
  const setFx = (patch: Partial<TextEffects>) => bg.updateAppearance({ text: { ...fx, ...patch } });
  const fontOption = <T extends string>(id: T) => ({ id, label: id === 'system' ? t('settings:backgrounds.fonts.system') : FONT_FAMILIES[id as keyof typeof FONT_FAMILIES].label, fontFamily: id === 'system' || !bg.fontsLoaded ? undefined : FONT_FAMILIES[id as keyof typeof FONT_FAMILIES].regular });
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  return (
    <CollapsiblePanel title={t('settings:appearance.text.title')} info={t('settings:appearance.text.info')} palette={palette} testID="appearance-text">
      <ChatPreview palette={palette} />
      <Text variant="labelLarge" style={{ color: palette.text }}>{t('settings:backgrounds.fonts.ui')}</Text>
      <ChipRow palette={palette} options={UI_FONT_IDS.map(fontOption)} value={bg.appearance.uiFont} onChange={(id) => bg.updateAppearance({ uiFont: id })} />
      <Text variant="labelLarge" style={{ color: palette.text }}>{t('settings:backgrounds.fonts.code')}</Text>
      <ChipRow palette={palette} options={CODE_FONT_IDS.map(fontOption)} value={bg.appearance.codeFont} onChange={(id) => bg.updateAppearance({ codeFont: id })} />
      <NumericSlider label={t('settings:backgrounds.fonts.textSize')} minimum={TEXT_SCALE_MIN} maximum={TEXT_SCALE_MAX} step={0.05} palette={palette}
        value={bg.appearance.textScale} valueLabel={pct(bg.appearance.textScale)} onValueChange={(v) => bg.updateAppearance({ textScale: v })} />
      <Text variant="bodySmall" style={{ color: palette.muted }}>{t('settings:backgrounds.fonts.textSizeHint')}</Text>
      {chatTextSize ? (
        <NumericSlider label={t('settings:appearance.chatTextSize')} minimum={chatTextSize.min} maximum={chatTextSize.max} step={1} palette={palette}
          value={chatTextSize.value} valueLabel={`${chatTextSize.value} px`} onValueChange={chatTextSize.onChange} />
      ) : null}
      <ColorRow label={t('settings:appearance.text.color')} value={fx.color ?? palette.text} palette={palette} quick={[palette.text, '#ffffff', '#c9c2ff', '#5ee0b0']} onChange={(hex) => setFx({ color: hex.toLowerCase() === palette.text.toLowerCase() ? null : hex })} testID="text-color" />

      <NumericSlider label={t('settings:appearance.text.shadow')} minimum={0} maximum={1} step={0.05} palette={palette} value={fx.shadow} valueLabel={pct(fx.shadow)} onValueChange={(v) => setFx({ shadow: v })} />
      <ChipRow palette={palette} options={[{ id: 'black', label: t('settings:appearance.text.shadowBlack') }, { id: 'surface', label: t('settings:appearance.text.shadowSurface') }]} value={fx.shadowMode} onChange={(id) => setFx({ shadowMode: id })} />
      <ColorRow label={t('settings:appearance.text.outlineColor')} value={fx.outlineColor} palette={palette} quick={['#000000', '#ffffff', '#6d5cff', '#ec4899']} onChange={(hex) => setFx({ outlineColor: hex })} testID="text-outline-color" />
      <NumericSlider label={t('settings:appearance.text.outline')} minimum={0} maximum={OUTLINE_MAX} step={0.5} palette={palette} value={fx.outline} valueLabel={`${fx.outline}px`} onValueChange={(v) => setFx({ outline: v })} />
      <NumericSlider label={t('settings:appearance.text.glow')} minimum={0} maximum={1} step={0.05} palette={palette} value={fx.glow} valueLabel={pct(fx.glow)} onValueChange={(v) => setFx({ glow: v })} />
      <NumericSlider label={t('settings:appearance.text.gradient')} minimum={0} maximum={1} step={0.05} palette={palette} value={fx.gradient} valueLabel={pct(fx.gradient)} onValueChange={(v) => setFx({ gradient: v })} />
      <NumericSlider label={t('settings:appearance.text.emboss')} minimum={0} maximum={1} step={0.05} palette={palette} value={fx.emboss} valueLabel={pct(fx.emboss)} onValueChange={(v) => setFx({ emboss: v })} />
      <Text variant="bodySmall" style={{ color: palette.muted }}>{t('settings:appearance.text.effectsHint')}</Text>
    </CollapsiblePanel>
  );
}

const FAKE_REPLIES = [
  'Sure! I updated the **settings sheet** and ran the tests. Everything passes.',
  'Here is the plan: first the background, then the colors, then the sliders.',
  'Done. The new aurora has two light balls that blend where they meet.',
];

/** Streams fake assistant replies a few characters at a time so text changes show live. */
function ChatPreview({ palette }: { palette: Palette }) {
  const { t } = useTranslation();
  const bg = useBackground();
  const [reply, setReply] = useState(0);
  const [chars, setChars] = useState(0);
  const full = FAKE_REPLIES[reply % FAKE_REPLIES.length].replace(/\*\*/g, '');
  useEffect(() => {
    const id = setInterval(() => {
      setChars((c) => {
        if (c >= full.length + 25) { setReply((r) => r + 1); return 0; } // short pause at the end
        return c + 2;
      });
    }, 70);
    return () => clearInterval(id);
  }, [full.length]);
  const fx = useMemo(() => resolveTextEffects(bg.appearance.text, { text: palette.text, surface: palette.surfaceSolid, accent: palette.tint }), [bg.appearance.text, palette.text, palette.surfaceSolid, palette.tint]);
  const shown = full.slice(0, chars);
  const words = shown.split(/(\s+)/);
  const fontSize = 15 * bg.appearance.textScale;
  const font = bg.appearance.uiFont !== 'system' && bg.fontsLoaded ? FONT_FAMILIES[bg.appearance.uiFont].regular : undefined;
  return (
    <View style={[styles.preview, { borderColor: palette.border, backgroundColor: palette.surfaceSolid }]} testID="text-preview">
      <View style={[styles.bubble, styles.user, { backgroundColor: palette.surfaceAlt }]}>
        <View style={{ filter: fx.filter }}><NativeText style={{ color: fx.color, fontSize, fontFamily: font }}>{t('settings:appearance.text.previewQuestion')}</NativeText></View>
      </View>
      <View style={[styles.bubble, { filter: fx.filter }]}>
        <NativeText style={{ fontSize, lineHeight: fontSize * 1.5, fontFamily: font }}>
          {words.map((w, i) => <NativeText key={i} style={{ color: fx.colorAt(words.length > 1 ? i / (words.length - 1) : 0) }}>{w}</NativeText>)}
          <NativeText style={{ color: palette.muted }}>{chars < full.length ? '▍' : ''}</NativeText>
        </NativeText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { borderRadius: 12, borderWidth: 1, gap: 8, minHeight: 130, padding: 10 },
  bubble: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  user: { alignSelf: 'flex-end', maxWidth: '80%' },
});
