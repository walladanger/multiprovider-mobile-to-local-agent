import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

import { BackgroundLayer } from '@/components/background/motion-background';
import { CollapsiblePanel } from '@/components/settings/appearance/collapsible-panel';
import { ColorRow, QUICK_SWATCHES } from '@/components/settings/appearance/color-picker';
import { TextFontsPanel, type ChatTextSize } from '@/components/settings/appearance/text-fonts-panel';
import { Icon } from '@/components/ui/icon';
import { NumericSlider } from '@/components/ui/numeric-slider';
import { ICON_PACKS } from '@/lib/backgrounds/appearance';
import { BUILTIN_PRESETS, presetThumbnail } from '@/lib/backgrounds/builtin-presets';
import { COLOR_THEME_IDS, COLOR_THEMES } from '@/lib/backgrounds/color-themes';
import { MESH_PRESETS } from '@/lib/backgrounds/mesh-presets';
import { fromOffset, sliderRange, toOffset, type SliderKey } from '@/lib/backgrounds/offsets';
import { LAYER_NOUNS, paramSchema, STYLE_EXTRAS } from '@/lib/backgrounds/params';
import { BACKGROUND_DEFAULTS, BACKGROUND_KINDS, type BackgroundSettings } from '@/lib/backgrounds/settings';
import { SKIN_IDS } from '@/lib/backgrounds/skins';
import { useBackground } from '@/providers/background-context';
import type { Palette } from './setting-rows';

const valueText = (key: SliderKey, v: number) =>
  key === 'blur' ? `${v}px` : key === 'particleCount' ? String(v) : key === 'noiseIntensity' ? v.toFixed(4) : key === 'invert' ? `${v > 0 ? '+' : ''}${v.toFixed(2)}` : v.toFixed(2);

/** Settings > Appearance: Background, Theme, Icons and Text & fonts panels, each collapsible. */
export function BackgroundSection({ palette, chatTextSize }: { palette: Palette; chatTextSize?: ChatTextSize }) {
  const { t } = useTranslation();
  return (
    <View style={styles.section}>
      <BackgroundPanel palette={palette} />
      <ThemePanel palette={palette} />
      <IconsPanel palette={palette} />
      <TextFontsPanel palette={palette} chatTextSize={chatTextSize} />
      <Text variant="bodySmall" style={{ color: palette.muted }}>{t('settings:appearance.footer')}</Text>
    </View>
  );
}

function BackgroundPanel({ palette }: { palette: Palette }) {
  const { t } = useTranslation();
  const bg = useBackground();
  const { settings } = bg;
  const def = BACKGROUND_DEFAULTS[settings.kind];
  const sample = <BackgroundLayer settings={settings} />;

  return (
    <CollapsiblePanel title={t('settings:appearance.background.title')} info={t('settings:appearance.background.info')} palette={palette} defaultOpen testID="appearance-background">
      <View style={[styles.preview, { borderColor: palette.border }]} testID="background-preview">
        <BackgroundLayer settings={settings} width={PREVIEW_W} height={PREVIEW_H} />
      </View>

      <CollapsiblePanel title={t('settings:backgrounds.builtin')} info={t('settings:appearance.presets.info')} palette={palette} defaultOpen testID="appearance-presets">
        <Text variant="bodySmall" style={{ color: palette.muted }}>{t('settings:appearance.presets.hint')}</Text>
        <View style={styles.chips}>
          {BUILTIN_PRESETS.map((p) => (
            <Pressable key={p.id} accessibilityRole="button" testID={`builtin-preset-${p.id}`} onPress={() => bg.applySettings(p.settings)}
              style={[styles.chip, styles.thumbChip, { borderColor: palette.border, backgroundColor: palette.surface }]}>
              <View style={styles.thumb}>{presetThumbnail(p).map((c, i) => <View key={i} style={{ backgroundColor: c, flex: 1 }} />)}</View>
              <Text style={{ color: palette.text }}>{p.name}</Text>
            </Pressable>
          ))}
        </View>
      </CollapsiblePanel>

      <CollapsiblePanel title={t('settings:backgrounds.style')} info={t('settings:appearance.style.info')} palette={palette} defaultOpen testID="appearance-style">
        <View style={styles.chips}>
          {BACKGROUND_KINDS.map((kind) => (
            <Pressable key={kind} accessibilityRole="button" accessibilityState={{ selected: settings.kind === kind }} onPress={() => bg.selectKind(kind)} testID={`background-kind-${kind}`}
              style={[styles.chip, { borderColor: settings.kind === kind ? palette.tint : palette.border, backgroundColor: settings.kind === kind ? palette.surfaceAlt : palette.surface }]}>
              <Text style={{ color: palette.text }}>{t(`settings:backgrounds.kinds.${kind}`)}</Text>
            </Pressable>
          ))}
        </View>
        <Text variant="bodySmall" style={{ color: palette.muted }} testID="background-description">{t(`settings:backgrounds.descriptions.${settings.kind}`)}</Text>
        {settings.kind === 'paths' ? (
          <ChipRow palette={palette} options={[{ id: '0', label: t('settings:backgrounds.controls.positionBoth') }, { id: '1', label: t('settings:backgrounds.controls.positionRight') }, { id: '-1', label: t('settings:backgrounds.controls.positionLeft') }]}
            value={String(settings.position) as '0' | '1' | '-1'} onChange={(id) => bg.update({ position: Number(id) })} />
        ) : null}
        {settings.kind === 'mesh' ? (
          <ChipRow palette={palette} options={MESH_PRESETS.map((m) => ({ id: m.id, label: m.name }))} value={MESH_PRESETS.find((m) => JSON.stringify(m.stops) === JSON.stringify(settings.stops))?.id ?? ''}
            onChange={(id) => { const m = MESH_PRESETS.find((x) => x.id === id); if (m) bg.update({ stops: m.stops, colorBack: m.colorBack, blur: m.blur }); }} />
        ) : null}
      </CollapsiblePanel>

      <CollapsiblePanel title={t('settings:appearance.colors.title')} info={t('settings:appearance.colors.info')} palette={palette} testID="appearance-colors">
        <ColorsBlock settings={settings} palette={palette} sample={sample} />
      </CollapsiblePanel>

      <CollapsiblePanel title={t('settings:appearance.sliders.title')} info={t('settings:appearance.sliders.info')} palette={palette} testID="appearance-sliders">
        {[...paramSchema(settings.kind), ...(STYLE_EXTRAS[settings.kind] ?? []).map((key) => ({ key, supported: true }))].map(({ key, supported }) => {
          // Sliders show an offset (-100..+100) from OUR default; 0 = our variant. Values stay absolute.
          const [min, max] = sliderRange(settings.kind, key);
          const d = def[key];
          const offset = toOffset(settings[key], d, min, max);
          const label = supported ? t(`settings:backgrounds.controls.${key}`) : `${t(`settings:backgrounds.controls.${key}`)} · ${t('settings:appearance.sliders.noEffect')}`;
          return (
            <View key={key} style={[styles.sliderRow, !supported && styles.dim]} testID={`background-slider-${key}`}>
              <View style={styles.flex}>
                <NumericSlider label={label} minimum={-100} maximum={100} step={5} palette={palette}
                  value={offset} valueLabel={`${offset > 0 ? '+' : ''}${offset} (${valueText(key, settings[key])})`}
                  onValueChange={(o) => bg.update({ [key]: key === 'particleCount' ? Math.round(fromOffset(o, d, min, max)) : fromOffset(o, d, min, max) })} />
              </View>
              <Button compact disabled={settings[key] === d} onPress={() => bg.update({ [key]: d })}>{t('settings:backgrounds.controls.reset')}</Button>
            </View>
          );
        })}
        <Button mode="outlined" onPress={() => bg.applySettings(BACKGROUND_DEFAULTS[settings.kind])}>{t('settings:backgrounds.controls.resetAll')}</Button>
      </CollapsiblePanel>

      <SavedLooks palette={palette} />
    </CollapsiblePanel>
  );
}

function ColorsBlock({ settings, palette, sample }: { settings: BackgroundSettings; palette: Palette; sample: React.ReactNode }) {
  const { t } = useTranslation();
  const bg = useBackground();
  const def = BACKGROUND_DEFAULTS[settings.kind];
  const quick = (d?: string) => (d ? [d, ...QUICK_SWATCHES.slice(0, 3)] : QUICK_SWATCHES);
  if (settings.kind === 'video') return <Text variant="bodySmall" style={{ color: palette.muted }}>{t('settings:appearance.colors.none')}</Text>;
  const noun = LAYER_NOUNS[settings.kind];
  const rows: React.ReactNode[] = [
    <ColorRow key="back" label={t('settings:backgrounds.controls.colorBack')} value={settings.colorBack} palette={palette} quick={quick(def.colorBack)} sampleSource={sample}
      onChange={(hex) => bg.update({ colorBack: hex })} testID="color-row-colorBack" />,
  ];
  if (settings.kind === 'gradient') {
    rows.push(
      <ColorRow key="a" label={t('settings:backgrounds.controls.colorA')} value={settings.colorA} palette={palette} quick={quick(def.colorA)} sampleSource={sample} onChange={(hex) => bg.update({ colorA: hex })} testID="color-row-colorA" />,
      <ColorRow key="b" label={t('settings:backgrounds.controls.colorB')} value={settings.colorB} palette={palette} quick={quick(def.colorB)} sampleSource={sample} onChange={(hex) => bg.update({ colorB: hex })} testID="color-row-colorB" />,
    );
  } else if (settings.kind === 'mesh' || settings.kind === 'papermesh') {
    const stops = settings.kind === 'papermesh' ? settings.stops.slice(0, 6) : settings.stops;
    stops.forEach((stop, index) => rows.push(
      <ColorRow key={`s${index}`} label={t(`settings:appearance.layers.${noun}`, { value: index + 1 })} value={stop.color} palette={palette} quick={quick(def.stops[index]?.color)} sampleSource={sample}
        onChange={(hex) => bg.update({ stops: settings.stops.map((x, j) => (j === index ? { ...x, color: hex } : x)) })} testID={`color-row-stop-${index}`} />,
    ));
  } else {
    settings.layerColors.forEach((color, index) => rows.push(
      <ColorRow key={`l${index}`} label={t(`settings:appearance.layers.${noun}`, { value: index + 1 })} value={color} palette={palette} quick={quick(def.layerColors[index])} sampleSource={sample}
        onChange={(hex) => bg.update({ layerColors: settings.layerColors.map((x, j) => (j === index ? hex : x)) })} testID={`color-row-layer-${index}`} />,
    ));
  }
  return <>{rows}</>;
}

function SavedLooks({ palette }: { palette: Palette }) {
  const { t } = useTranslation();
  const bg = useBackground();
  const [name, setName] = useState('');
  const [renaming, setRenaming] = useState<string>();
  return (
    <CollapsiblePanel title={t('settings:backgrounds.presets.title')} info={t('settings:appearance.saved.info')} palette={palette} testID="appearance-saved">
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
    </CollapsiblePanel>
  );
}

function ThemePanel({ palette }: { palette: Palette }) {
  const { t } = useTranslation();
  const bg = useBackground();
  return (
    <CollapsiblePanel title={t('settings:backgrounds.theme.title')} info={t('settings:backgrounds.theme.hint')} palette={palette} testID="appearance-theme">
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
      <Text variant="labelLarge" style={{ color: palette.text }}>{t('settings:backgrounds.skin.title')}</Text>
      <ChipRow palette={palette} options={SKIN_IDS.map((id) => ({ id, label: t(`settings:backgrounds.skin.names.${id}`) }))} value={bg.appearance.skinId} onChange={(id) => bg.updateAppearance({ skinId: id })} />
    </CollapsiblePanel>
  );
}

function IconsPanel({ palette }: { palette: Palette }) {
  const { t } = useTranslation();
  const bg = useBackground();
  return (
    <CollapsiblePanel title={t('settings:backgrounds.icons.title')} info={t('settings:appearance.icons.info')} palette={palette} testID="appearance-icons">
      <ChipRow palette={palette} options={ICON_PACKS.map((id) => ({ id, label: t(`settings:backgrounds.icons.packs.${id}`) }))} value={bg.appearance.iconPack} onChange={(id) => bg.updateAppearance({ iconPack: id })} />
      <View style={styles.chips}>
        {(['chat', 'terminal', 'folder', 'settings', 'palette', 'bell'] as const).map((n) => <Icon key={n} name={n} size={22} color={palette.tint} />)}
      </View>
    </CollapsiblePanel>
  );
}

export function ChipRow<T extends string>({ options, value, onChange, palette }: { options: { id: T; label: string; fontFamily?: string }[]; value: T; onChange: (id: T) => void; palette: Palette }) {
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

// The mini preview is small on purpose: it renders the live background a second time.
const PREVIEW_W = 240;
const PREVIEW_H = 130;

const styles = StyleSheet.create({
  section: { gap: 12, paddingBottom: 8 },
  preview: { alignSelf: 'center', borderRadius: 14, borderWidth: 1, height: PREVIEW_H, overflow: 'hidden', width: PREVIEW_W },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  themeChip: { alignItems: 'center', borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  sliderRow: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  dim: { opacity: 0.55 },
  thumbChip: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  thumb: { borderRadius: 6, flexDirection: 'row', height: 18, overflow: 'hidden', width: 28 },
  themeDot: { borderRadius: 6, height: 12, width: 12 },
  saveRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  presetRow: { alignItems: 'center', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 4, paddingLeft: 12 },
  flex: { flex: 1 },
});
