import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

import { BackgroundLayer } from '@/components/background/motion-background';
import { Icon } from '@/components/ui/icon';
import { NumericSlider } from '@/components/ui/numeric-slider';
import { ICON_PACKS } from '@/lib/backgrounds/appearance';
import { COLOR_THEME_IDS, COLOR_THEMES } from '@/lib/backgrounds/color-themes';
import { CODE_FONT_IDS, FONT_FAMILIES, TEXT_SCALE_MAX, TEXT_SCALE_MIN, UI_FONT_IDS } from '@/lib/backgrounds/fonts';
import { SKIN_IDS } from '@/lib/backgrounds/skins';
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

      <Text variant="titleSmall" style={{ color: palette.text }}>{t('settings:backgrounds.theme.title')}</Text>
      <View style={styles.chips}>
        {COLOR_THEME_IDS.map((id) => {
          const th = COLOR_THEMES[id];
          const selected = bg.appearance.themeId === id;
          return (
            <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => bg.selectTheme(id)} testID={`color-theme-${id}`}
              style={[styles.themeChip, { backgroundColor: th.bg, borderColor: selected ? th.primarySoft : palette.border }]}>
              <View style={[styles.themeDot, { backgroundColor: th.primary }]} />
              <View style={[styles.themeDot, { backgroundColor: th.accent }]} />
              <Text style={{ color: th.text }}>{t(`settings:backgrounds.theme.names.${id}`)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text variant="bodySmall" style={{ color: palette.muted }}>{t('settings:backgrounds.theme.hint')}</Text>

      <Text variant="titleSmall" style={{ color: palette.text }}>{t('settings:backgrounds.skin.title')}</Text>
      <ChipRow palette={palette} options={SKIN_IDS.map((id) => ({ id, label: t(`settings:backgrounds.skin.names.${id}`) }))} value={bg.appearance.skinId} onChange={(id) => bg.updateAppearance({ skinId: id })} />

      <Text variant="titleSmall" style={{ color: palette.text }}>{t('settings:backgrounds.fonts.ui')}</Text>
      <ChipRow palette={palette} options={UI_FONT_IDS.map((id) => ({ id, label: id === 'system' ? t('settings:backgrounds.fonts.system') : FONT_FAMILIES[id].label, fontFamily: id === 'system' || !bg.fontsLoaded ? undefined : FONT_FAMILIES[id].regular }))} value={bg.appearance.uiFont} onChange={(id) => bg.updateAppearance({ uiFont: id })} />
      <Text variant="titleSmall" style={{ color: palette.text }}>{t('settings:backgrounds.fonts.code')}</Text>
      <ChipRow palette={palette} options={CODE_FONT_IDS.map((id) => ({ id, label: id === 'system' ? t('settings:backgrounds.fonts.system') : FONT_FAMILIES[id].label, fontFamily: id === 'system' || !bg.fontsLoaded ? undefined : FONT_FAMILIES[id].regular }))} value={bg.appearance.codeFont} onChange={(id) => bg.updateAppearance({ codeFont: id })} />
      <NumericSlider label={t('settings:backgrounds.fonts.textSize')} minimum={TEXT_SCALE_MIN} maximum={TEXT_SCALE_MAX} step={0.05} palette={palette}
        value={bg.appearance.textScale} valueLabel={`${Math.round(bg.appearance.textScale * 100)}%`} onValueChange={(v) => bg.updateAppearance({ textScale: v })} />
      <Text variant="bodySmall" style={{ color: palette.muted }}>{t('settings:backgrounds.fonts.textSizeHint')}</Text>

      <Text variant="titleSmall" style={{ color: palette.text }}>{t('settings:backgrounds.icons.title')}</Text>
      <ChipRow palette={palette} options={ICON_PACKS.map((id) => ({ id, label: t(`settings:backgrounds.icons.packs.${id}`) }))} value={bg.appearance.iconPack} onChange={(id) => bg.updateAppearance({ iconPack: id })} />
      <View style={styles.chips}>
        {(['chat', 'terminal', 'folder', 'settings', 'palette', 'bell'] as const).map((n) => <Icon key={n} name={n} size={22} color={palette.tint} />)}
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

function ChipRow<T extends string>({ options, value, onChange, palette }: { options: { id: T; label: string; fontFamily?: string }[]; value: T; onChange: (id: T) => void; palette: Palette }) {
  return (
    <View style={styles.chips}>
      {options.map((o) => (
        <Pressable key={o.id} accessibilityRole="button" accessibilityState={{ selected: value === o.id }} onPress={() => onChange(o.id)}
          style={[styles.chip, { borderColor: value === o.id ? palette.tint : palette.border, backgroundColor: value === o.id ? palette.surfaceAlt : palette.surface }]}>
          <Text style={{ color: palette.text, fontFamily: o.fontFamily }}>{o.label}</Text>
        </Pressable>
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
  themeChip: { alignItems: 'center', borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  themeDot: { borderRadius: 6, height: 12, width: 12 },
  swatch: { borderRadius: 14, height: 28, width: 28 },
  saveRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  presetRow: { alignItems: 'center', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 4, paddingLeft: 12 },
  flex: { flex: 1 },
});
