import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

import { BackgroundLayer } from '@/components/background/motion-background';
import { NumericSlider } from '@/components/ui/numeric-slider';
import { BACKGROUND_KINDS, type BackgroundKind, type BackgroundSettings } from '@/lib/backgrounds/settings';
import { useBackground } from '@/providers/background-context';
import type { Palette } from './setting-rows';

const SWATCHES = ['#6d5cff', '#8b5cf6', '#3b82f6', '#00ffff', '#c9c2ff', '#f0abfc', '#5ee0b0', '#ffffff', '#1a1446', '#0b0a2a', '#220011', '#09090b'];

type ColorKey = 'colorA' | 'colorB' | 'colorBack';
// Which controls make sense for each background.
const CONTROLS: Record<BackgroundKind, { colors: ColorKey[]; sliders: ('speed' | 'density' | 'intensity' | 'blur' | 'opacity')[] }> = {
  gradient: { colors: ['colorA', 'colorB', 'colorBack'], sliders: [] },
  video: { colors: [], sliders: ['intensity'] },
  paths: { colors: ['colorA', 'colorB', 'colorBack'], sliders: ['speed', 'density', 'intensity', 'blur', 'opacity'] },
  liquid: { colors: ['colorA', 'colorB', 'colorBack'], sliders: ['speed', 'density', 'intensity', 'blur', 'opacity'] },
  swirl: { colors: ['colorA', 'colorBack'], sliders: ['speed', 'density', 'intensity', 'blur', 'opacity'] },
};
const RANGES = { speed: [0, 2, 0.05], density: [0, 1, 0.05], intensity: [0, 1, 0.05], blur: [0, 20, 1], opacity: [0, 1, 0.05] } as const;

export function BackgroundSection({ palette }: { palette: Palette }) {
  const { t } = useTranslation();
  const bg = useBackground();
  const { settings } = bg;
  const [name, setName] = useState('');
  const [renaming, setRenaming] = useState<string>();
  const controls = CONTROLS[settings.kind];

  return (
    <View style={styles.section}>
      <Text variant="titleSmall" style={{ color: palette.text }}>{t('settings:backgrounds.preview')}</Text>
      <View style={[styles.preview, { borderColor: palette.border }]} testID="background-preview">
        <BackgroundLayer settings={settings} width={PREVIEW_W} height={PREVIEW_H} />
      </View>

      <Text variant="titleSmall" style={{ color: palette.text }}>{t('settings:backgrounds.style')}</Text>
      <View style={styles.chips}>
        {BACKGROUND_KINDS.map((kind) => (
          <Pressable key={kind} accessibilityRole="button" accessibilityState={{ selected: settings.kind === kind }} onPress={() => bg.selectKind(kind)}
            style={[styles.chip, { borderColor: settings.kind === kind ? palette.tint : palette.border, backgroundColor: settings.kind === kind ? palette.surfaceAlt : palette.surface }]}>
            <Text style={{ color: palette.text }}>{t(`settings:backgrounds.kinds.${kind}`)}</Text>
          </Pressable>
        ))}
      </View>
      <Text variant="bodySmall" style={{ color: palette.muted }}>{t(`settings:backgrounds.descriptions.${settings.kind}`)}</Text>

      {controls.colors.map((key) => (
        <View key={key} style={styles.colorRow}>
          <Text variant="bodyMedium" style={{ color: palette.text }}>{t(`settings:backgrounds.controls.${key}`)}</Text>
          <View style={styles.chips}>
            {SWATCHES.map((hex) => (
              <Pressable key={hex} accessibilityRole="button" accessibilityLabel={`${t(`settings:backgrounds.controls.${key}`)} ${hex}`} onPress={() => bg.update({ [key]: hex } as Partial<BackgroundSettings>)}
                style={[styles.swatch, { backgroundColor: hex, borderColor: settings[key] === hex ? palette.text : palette.border, borderWidth: settings[key] === hex ? 2 : 1 }]} />
            ))}
          </View>
        </View>
      ))}

      {controls.sliders.map((key) => {
        const [min, max, step] = RANGES[key];
        return (
          <NumericSlider key={key} label={t(`settings:backgrounds.controls.${key}`)} minimum={min} maximum={max} step={step} palette={palette}
            value={settings[key]} valueLabel={key === 'blur' ? `${settings[key]}px` : settings[key].toFixed(2)} onValueChange={(v) => bg.update({ [key]: v })} />
        );
      })}

      <Text variant="titleSmall" style={{ color: palette.text }}>{t('settings:backgrounds.presets.title')}</Text>
      <View style={styles.saveRow}>
        <TextInput mode="outlined" dense style={styles.flex} value={name} onChangeText={setName}
          label={renaming ? t('settings:backgrounds.presets.newName') : t('settings:backgrounds.presets.name')} />
        <Button mode="contained" disabled={!name.trim()} onPress={() => {
          if (renaming) bg.renamePreset(renaming, name); else bg.savePreset(name);
          setName(''); setRenaming(undefined);
        }}>{renaming ? t('settings:backgrounds.presets.rename') : t('settings:backgrounds.presets.save')}</Button>
      </View>
      {bg.presets.length === 0 ? <Text variant="bodySmall" style={{ color: palette.muted }}>{t('settings:backgrounds.presets.empty')}</Text> : null}
      {bg.presets.map((preset) => (
        <View key={preset.id} style={[styles.presetRow, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <View style={styles.flex}>
            <Text variant="bodyLarge" style={{ color: palette.text }}>{preset.name}</Text>
            <Text variant="bodySmall" style={{ color: palette.muted }}>{t(`settings:backgrounds.kinds.${preset.settings.kind}`)}</Text>
          </View>
          <Button compact onPress={() => bg.loadPreset(preset.id)}>{t('settings:backgrounds.presets.load')}</Button>
          <Button compact onPress={() => { setRenaming(preset.id); setName(preset.name); }}>{t('settings:backgrounds.presets.rename')}</Button>
          <Button compact textColor={palette.danger} onPress={() => bg.deletePreset(preset.id)}>{t('settings:backgrounds.presets.delete')}</Button>
        </View>
      ))}
    </View>
  );
}

const PREVIEW_W = 300;
const PREVIEW_H = 170;

const styles = StyleSheet.create({
  section: { gap: 12, paddingBottom: 8 },
  preview: { alignSelf: 'center', borderRadius: 16, borderWidth: 1, height: PREVIEW_H, overflow: 'hidden', width: PREVIEW_W },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  colorRow: { gap: 6 },
  swatch: { borderRadius: 14, height: 28, width: 28 },
  saveRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  presetRow: { alignItems: 'center', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 4, paddingLeft: 12 },
  flex: { flex: 1 },
});
