import { memo, useMemo } from 'react';
import { Linking, View } from 'react-native';
import { EnrichedMarkdownText, type MarkdownStyle } from 'react-native-enriched-markdown';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FONT_FAMILIES } from '@/lib/backgrounds/fonts';
import { DEFAULT_TEXT_EFFECTS, resolveTextEffects } from '@/lib/backgrounds/text-effects';
import { useOptionalBackground } from '@/providers/background-context';

const allowedLinkProtocols = new Set(['http:', 'https:', 'mailto:', 'tel:']);

function openMarkdownLink(url: string) {
  try {
    if (!allowedLinkProtocols.has(new URL(url).protocol.toLowerCase())) {
      return;
    }
  } catch {
    return;
  }

  void Linking.openURL(url).catch(() => undefined);
}

function MarkdownTextImpl({ text, color: baseColor, fontSize, mutedColor }: { text: string; color: string; fontSize: number; mutedColor: string }) {
  const scale = fontSize / 16;
  // Settings > Appearance > Text & fonts: font, color and effects apply to the real transcript too.
  const bg = useOptionalBackground();
  const palette = Colors[useColorScheme() ?? 'light'];
  const textFx = bg?.appearance.text ?? DEFAULT_TEXT_EFFECTS;
  const uiFont = bg && bg.appearance.uiFont !== 'system' && bg.fontsLoaded ? FONT_FAMILIES[bg.appearance.uiFont].regular : undefined;
  const fx = useMemo(() => resolveTextEffects(textFx, { text: baseColor, surface: palette.surfaceSolid, accent: palette.tint }), [textFx, baseColor, palette.surfaceSolid, palette.tint]);
  const color = fx.color;
  const heading = fx.headingColor;
  const markdownStyle = useMemo<MarkdownStyle>(() => ({
    paragraph: { fontSize, color, lineHeight: 26 * scale, ...(uiFont ? { fontFamily: uiFont } : {}) },
    h1: { fontSize: 24 * scale, fontWeight: '700', color: heading },
    h2: { fontSize: 18 * scale, fontWeight: '700', color: heading },
    h3: { fontSize: 16 * scale, fontWeight: '700', color: heading },
    h4: { fontSize: 15 * scale, fontWeight: '700', color: heading },
    h5: { fontSize: 14 * scale, fontWeight: '700', color: heading },
    h6: { fontSize: 13 * scale, fontWeight: '700', color: heading },
    list: { fontSize, color, lineHeight: 26 * scale, bulletColor: color, markerColor: color, gapWidth: 10, ...(uiFont ? { fontFamily: uiFont } : {}) },
    strong: { color: fx.strongColor },
    link: { color: fx.strongColor, underline: true },
    code: { fontSize: 15 * scale, color, backgroundColor: 'rgba(0,0,0,0.08)' },
    codeBlock: { fontSize: 15 * scale, lineHeight: 18 * scale, color, backgroundColor: 'rgba(0,0,0,0.08)', padding: 14, borderRadius: 14 },
    blockquote: { color, fontSize: 15 * scale, borderColor: mutedColor, borderWidth: 3 },
    table: {
      fontSize: 15 * scale,
      lineHeight: 20 * scale,
      color,
      borderColor: mutedColor,
      borderRadius: 8,
      headerBackgroundColor: 'rgba(0,0,0,0.08)',
      headerTextColor: color,
      rowEvenBackgroundColor: 'transparent',
      rowOddBackgroundColor: 'rgba(0,0,0,0.04)',
      cellPaddingHorizontal: 8,
      cellPaddingVertical: 6,
    },
    thematicBreak: { color: mutedColor },
  }), [color, heading, fx.strongColor, uiFont, fontSize, mutedColor, scale]);

  const content = (
    <EnrichedMarkdownText
      markdown={text}
      flavor="github"
      selectable
      containerStyle={{ alignSelf: 'stretch', minWidth: 0 }}
      markdownStyle={markdownStyle}
      onLinkPress={({ url }) => openMarkdownLink(url)}
    />
  );
  // Shadow / outline / glow / emboss are drop-shadow filters on a transparent wrapper (Android 12+).
  return fx.filter.length ? <View style={{ alignSelf: 'stretch', minWidth: 0, filter: fx.filter }}>{content}</View> : content;
}

// Keep the transcript boundary memoized; only the active streaming message
// changes text on each server delta.
export const MarkdownText = memo(MarkdownTextImpl);
