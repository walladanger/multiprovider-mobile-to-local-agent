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
import { BUILTIN_PRESETS, presetThumbnail } from '@/lib/backgrounds/builtin-presets';
import { MESH_PRESETS } from '@/lib/backgrounds/mesh-presets';
import { fromOffset, SLIDER_RANGES, toOffset, type SliderKey } from '@/lib/backgrounds/offsets';
import { BACKGROUND_DEFAULTS, BACKGROUND_KINDS, type BackgroundKind, type BackgroundSettings } from '@/lib/backgrounds/settings';
import { useBackground } from '@/providers/background-context';
import type { Palette } from './setting-rows';

const SWATCHES = ['#6d5cff', '#8b5cf6', '#3b82f6', '#00ffff', '#c9c2ff', '#f0abfc', '#5ee0b0', '#ffffff', '#1a1446', '#0b0a2a', '#220011', '#09090b'];

type ColorKey = 'colorA' | 'colorB' | 'colorBack';
// Which controls make sense for each background.
const CONTROLS: Record<BackgroundKind, { colors: ColorKey[]; sliders: SliderKey[] }> = {
  gradient: { colors: ['colorA', 'colorB', 'colorBack'], sliders: [] },
  video: { colors: [], sliders: ['intensity'] },
  paths: { colors: ['colorA', 'colorBack'], sliders: ['speed', 'density', 'intensity', 'blur', 'opacity'] },
  liquid: { colors: ['colorA', 'colorB', 'colorBack'], sliders: ['speed', 'density', 'intensity', 'blur', 'opacity'] },
  swirl: { colors: ['colorA', 'colorBack'], sliders: ['speed', 'density', 'intensity', 'blur', 'opacity'] },
  cyber: { colors: ['colorA', 'colorBack'], sliders: ['particleCount', 'noiseIntensity', 'particleSizeMin', 'particleSizeMax', 'speed', 'intensity', 'blur', 'opacity'] },
  mesh: { colors: ['colorBack'], sliders: ['speed', 'blur', 'opacity'] },
  prism: { colors: ['colorA', 'colorB', 'colorBack'], sliders: ['speed', 'intensity', 'scale', 'blur', 'opacity'] },
  aurora: { colors: ['colorA', 'colorB', 'colorBack'], sliders: ['speed', 'intensity', 'scale', 'blur', 'opacity'] },
  halftone: { colors: ['colorA', 'colorBack'], sliders: ['speed', 'intensity', 'scale', 'density', 'opacity'] },
  papermesh: { colors: ['colorBack'], sliders: ['speed', 'distortion', 'swirl', 'density', 'scale', 'intensity', 'opacity'] },
  hive: { colors: ['colorA', 'colorB', 'colorBack'], sliders: ['speed', 'intensity', 'scale', 'blur', 'opacity'] },
};
const RANGES = SLIDER_RANGES;
const valueText = (key: SliderKey, v: number) => key === 'blur' ? `${v}px` : key === 'particleCount' ? String(v) : key === 'noiseIntensity' ? v.toFixed(4) : v.toFixed(2);

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

      <Text variant="titleSmall" style={{ color: palette.text }}>{t('settings:backgrounds.builtin')}</Text>
      <View style={styles.chips}>
        {BUILTIN_PRESETS.map((p) => (
          <Pressable key={p.id} accessibilityRole="button" testID={`builtin-preset-${p.id}`} onPress={() => bg.applySettings(p.settings)}
            style={[styles.chip, styles.thumbChip, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <View style={styles.thumb}>{presetThumbnail(p).map((c, i) => <View key={i} style={{ backgroundColor: c, flex: 1 }} />)}</View>
            <Text style={{ color: palette.text }}>{p.name}</Text>
          </Pressable>
        ))}
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

      {settings.kind === 'paths' ? (
        <ChipRow palette={palette} options={[{ id: '0', label: t('settings:backgrounds.controls.positionBoth') }, { id: '1', label: t('settings:backgrounds.controls.positionRight') }, { id: '-1', label: t('settings:backgrounds.controls.positionLeft') }]}
          value={String(settings.position) as '0' | '1' | '-1'} onChange={(id) => bg.update({ position: Number(id) })} />
      ) : null}
      {settings.kind === 'mesh' || settings.kind === 'papermesh' ? (
        <>
          {settings.kind === 'mesh' ? <ChipRow palette={palette} options={MESH_PRESETS.map((m) => ({ id: m.id, label: m.name }))} value={MESH_PRESETS.find((m) => JSON.stringify(m.stops) === JSON.stringify(settings.stops))?.id ?? ''}
            onChange={(id) => { const m = MESH_PRESETS.find((x) => x.id === id); if (m) bg.update({ stops: m.stops, colorBack: m.colorBack, blur: m.blur }); }} /> : null}
          {settings.stops.map((stop, index) => (
            <View key={index} style={styles.colorRow}>
              <Text variant="bodyMedium" style={{ color: palette.text }}>{t('settings:backgrounds.controls.stop', { value: index + 1 })}</Text>
              <View style={styles.chips}>
                {SWATCHES.map((hex) => (
                  <Pressable key={hex} accessibilityRole="button" accessibilityLabel={`${t('settings:backgrounds.controls.stop', { value: index + 1 })} ${hex}`}
                    onPress={() => bg.update({ stops: settings.stops.map((x, j) => (j === index ? { ...x, color: hex } : x)) })}
                    style={[styles.swatch, { backgroundColor: hex, borderColor: stop.color === hex ? palette.text : palette.border, borderWidth: stop.color === hex ? 2 : 1 }]} />
                ))}
              </View>
            </View>
          ))}
        </>
      ) : null}
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
        // Sliders show an offset (-100..+100) from OUR default; 0 = our variant. Values stay absolute.
        const [min, rawMax] = RANGES[key];
        const max = key === 'blur' && settings.kind === 'mesh' ? 120 : rawMax;
        const def = BACKGROUND_DEFAULTS[settings.kind][key];
        const offset = toOffset(settings[key], def, min, max);
        return (
          <View key={key} style={styles.sliderRow}>
            <View style={styles.flex}>
              <NumericSlider label={t(`settings:backgrounds.controls.${key}`)} minimum={-100} maximum={100} step={5} palette={palette}
                value={offset} valueLabel={`${offset > 0 ? '+' : ''}${offset} (${valueText(key, settings[key])})`}
                onValueChange={(o) => bg.update({ [key]: key === 'particleCount' ? Math.round(fromOffset(o, def, min, max)) : fromOffset(o, def, min, max) })} />
            </View>
            <Button compact disabled={offset === 0 && settings[key] === def} onPress={() => bg.update({ [key]: def })}>{t('settings:backgrounds.controls.reset')}</Button>
          </View>
        );
      })}
      <Button mode="outlined" onPress={() => bg.applySettings(BACKGROUND_DEFAULTS[settings.kind])}>{t('settings:backgrounds.controls.resetAll')}</Button>

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
  sliderRow: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  thumbChip: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  thumb: { borderRadius: 6, flexDirection: 'row', height: 18, overflow: 'hidden', width: 28 },
  themeDot: { borderRadius: 6, height: 12, width: 12 },
  swatch: { borderRadius: 14, height: 28, width: 28 },
  saveRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  presetRow: { alignItems: 'center', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 4, paddingLeft: 12 },
  flex: { flex: 1 },
});
