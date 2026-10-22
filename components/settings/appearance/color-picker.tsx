/**
 * Compact color row (current color, a few quick swatches, "more" button) and a full picker:
 * saturation/value square, hue strip, hex input, and an eyedropper that samples the live background
 * through a Skia view snapshot (makeImageFromView -> readPixels).
 */
import { AlphaType, ColorType, makeImageFromView } from '@shopify/react-native-skia';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

import type { Palette } from '@/components/settings/sections/setting-rows';
import { Icon } from '@/components/ui/icon';
import { hexToHsv, hsvToHex, parseHex, rgbBytesToHex } from '@/lib/backgrounds/color-math';

export const QUICK_SWATCHES = ['#6d5cff', '#00ffff', '#ec4899', '#ffffff'];

export function ColorRow({ label, value, onChange, palette, quick = QUICK_SWATCHES, sampleSource, testID }: {
  label: string; value: string; onChange: (hex: string) => void; palette: Palette; quick?: string[];
  /** Live content the eyedropper samples (usually the background preview). */
  sampleSource?: ReactNode; testID?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const swatches = [...new Set(quick.map((c) => c.toLowerCase()))].slice(0, 4);
  return (
    <View style={styles.row} testID={testID}>
      <Text variant="bodyMedium" numberOfLines={1} style={[styles.label, { color: palette.text }]}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t('settings:appearance.color.edit', { value: label })} onPress={() => setOpen(true)}
        style={[styles.current, { backgroundColor: value, borderColor: palette.text }]} />
      {swatches.map((hex) => (
        <Pressable key={hex} accessibilityRole="button" accessibilityLabel={`${label} ${hex}`} onPress={() => onChange(hex)}
          style={[styles.swatch, { backgroundColor: hex, borderColor: value.toLowerCase() === hex ? palette.text : palette.border, borderWidth: value.toLowerCase() === hex ? 2 : 1 }]} />
      ))}
      <Pressable accessibilityRole="button" accessibilityLabel={t('settings:appearance.color.more')} onPress={() => setOpen(true)} style={[styles.more, { borderColor: palette.border }]} testID={testID ? `${testID}-more` : undefined}>
        <Icon name="palette" size={16} color={palette.text} />
      </Pressable>
      {open ? <ColorPickerModal title={label} value={value} palette={palette} sampleSource={sampleSource} onClose={() => setOpen(false)} onChange={onChange} /> : null}
    </View>
  );
}

function useDrag(onPick: (x: number, y: number, w: number, h: number) => void, onRelease: () => void) {
  const size = useRef({ w: 1, h: 1 });
  const handle = (e: GestureResponderEvent) => onPick(Math.max(0, Math.min(size.current.w, e.nativeEvent.locationX)), Math.max(0, Math.min(size.current.h, e.nativeEvent.locationY)), size.current.w, size.current.h);
  return {
    onLayout: (e: LayoutChangeEvent) => { size.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }; },
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: handle,
    onResponderMove: handle,
    onResponderRelease: onRelease,
  };
}

const HUES = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000'] as const;

function ColorPickerModal({ title, value, onChange, onClose, palette, sampleSource }: {
  title: string; value: string; onChange: (hex: string) => void; onClose: () => void; palette: Palette; sampleSource?: ReactNode;
}) {
  const { t } = useTranslation();
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [hexText, setHexText] = useState(value);
  const [eyedropper, setEyedropper] = useState(false);
  const sampleRef = useRef<View>(null);
  const sampleSize = useRef({ w: 1, h: 1 });
  const current = hsvToHex(hsv[0], hsv[1], hsv[2]);
  // While dragging, the live background updates at most ~12x/s (each update re-renders and persists);
  // the final value is always committed on release.
  const lastSent = useRef(0);
  const pending = useRef<string | null>(null);
  const commit = (next: [number, number, number], force = true) => {
    setHsv(next);
    const hex = hsvToHex(...next);
    setHexText(hex);
    const now = Date.now();
    if (force || now - lastSent.current > 80) { lastSent.current = now; pending.current = null; onChange(hex); } else pending.current = hex;
  };
  const flush = () => { if (pending.current) { onChange(pending.current); pending.current = null; } };
  const sv = useDrag((x, y, w, h) => commit([hsv[0], x / w, 1 - y / h], false), flush);
  const hue = useDrag((x, _y, w) => commit([Math.min(359.9, (x / w) * 360), hsv[1], hsv[2]], false), flush);

  async function sample(e: GestureResponderEvent) {
    const { locationX, locationY } = e.nativeEvent;
    try {
      const image = await makeImageFromView(sampleRef);
      if (!image) return;
      const kx = image.width() / sampleSize.current.w; const ky = image.height() / sampleSize.current.h;
      const px = image.readPixels(Math.round(locationX * kx), Math.round(locationY * ky), { width: 1, height: 1, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul });
      if (px && px.length >= 3) {
        const scale = px instanceof Float32Array ? 255 : 1;
        const hex = rgbBytesToHex(px[0] * scale, px[1] * scale, px[2] * scale);
        commit(hexToHsv(hex));
      }
    } catch {
      // Snapshot unavailable (e.g. web): keep the current color.
    }
  }

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel={t('settings:appearance.color.close')} />
      <View style={styles.center} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: palette.surfaceSolid, borderColor: palette.border }]}>
          <View style={styles.titleRow}>
            <View style={[styles.current, { backgroundColor: current, borderColor: palette.text }]} />
            <Text variant="titleSmall" style={{ color: palette.text, flex: 1 }}>{title}</Text>
          </View>
          <View {...sv} style={[styles.sv, { backgroundColor: hsvToHex(hsv[0], 1, 1) }]} testID="color-picker-sv">
            <LinearGradient pointerEvents="none" colors={['#ffffff', '#ffffff00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            <LinearGradient pointerEvents="none" colors={['#00000000', '#000000']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
            <View pointerEvents="none" style={[styles.knob, { left: `${hsv[1] * 100}%`, top: `${(1 - hsv[2]) * 100}%` }]} />
          </View>
          <View {...hue} style={styles.hue} testID="color-picker-hue">
            <LinearGradient pointerEvents="none" colors={HUES} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: 8 }]} />
            <View pointerEvents="none" style={[styles.hueKnob, { left: `${(hsv[0] / 360) * 100}%` }]} />
          </View>
          <View style={styles.titleRow}>
            <TextInput mode="outlined" dense style={{ flex: 1 }} label={t('settings:appearance.color.hex')} value={hexText} autoCapitalize="none" autoCorrect={false}
              onChangeText={(text) => { setHexText(text); const hex = parseHex(text); if (hex) { setHsv(hexToHsv(hex)); onChange(hex); } }} testID="color-picker-hex" />
            {Platform.OS !== 'web' && sampleSource ? (
              <Button compact mode={eyedropper ? 'contained-tonal' : 'outlined'} onPress={() => setEyedropper((v) => !v)}>{t('settings:appearance.color.eyedropper')}</Button>
            ) : null}
          </View>
          {eyedropper && sampleSource ? (
            <>
              <Text variant="bodySmall" style={{ color: palette.muted }}>{t('settings:appearance.color.eyedropperHint')}</Text>
              <Pressable onPress={(e) => { void sample(e); }} onLayout={(e) => { sampleSize.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }; }} style={styles.sample}>
                <View ref={sampleRef} collapsable={false} style={StyleSheet.absoluteFill}>{sampleSource}</View>
              </Pressable>
            </>
          ) : null}
          <Button mode="contained" onPress={onClose}>{t('settings:appearance.color.done')}</Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  label: { flex: 1 },
  current: { borderRadius: 16, borderWidth: 2, height: 32, width: 32 },
  swatch: { borderRadius: 12, height: 24, width: 24 },
  more: { alignItems: 'center', borderRadius: 12, borderWidth: 1, height: 28, justifyContent: 'center', width: 28 },
  scrim: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  center: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { borderRadius: 18, borderWidth: 1, gap: 12, maxWidth: 380, padding: 16, width: '100%' },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  sv: { borderRadius: 10, height: 180, overflow: 'hidden' },
  knob: { borderColor: '#ffffff', borderRadius: 9, borderWidth: 2, height: 18, marginLeft: -9, marginTop: -9, position: 'absolute', width: 18 },
  hue: { borderRadius: 8, height: 26 },
  hueKnob: { backgroundColor: 'transparent', borderColor: '#ffffff', borderRadius: 4, borderWidth: 3, bottom: -2, marginLeft: -6, position: 'absolute', top: -2, width: 12 },
  sample: { borderRadius: 10, height: 140, overflow: 'hidden' },
});
