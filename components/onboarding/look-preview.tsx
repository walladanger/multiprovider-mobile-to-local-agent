import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { scaledFontSize } from '@/lib/backgrounds/fonts';
import { SKINS, type SkinId } from '@/lib/backgrounds/skins';
import { tokens } from '@/theme/tokens';

const MESSAGES = ['user1', 'assistant1', 'user2', 'assistant2', 'user3', 'assistant3'] as const;

/**
 * Live mock chat: messages appear one by one and the window auto-scrolls, so
 * font, text size, colors, background and panel style can be judged in motion.
 * With reduced motion every message is shown at once without animation.
 */
export function LookPreview({ background, skinId, testID = 'onboarding-look-preview' }: {
  background?: { colorA: string; colorB: string; colorBack: string };
  skinId?: SkinId;
  testID?: string;
}) {
  const { t } = useTranslation();
  const palette = Colors[useColorScheme() ?? 'light'];
  const reduceMotion = useReducedMotion();
  const [tick, setCount] = useState(1);
  const count = reduceMotion ? MESSAGES.length : tick;
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    if (reduceMotion) return;
    const timer = setInterval(() => setCount((value) => (value >= MESSAGES.length ? 1 : value + 1)), 1500);
    return () => clearInterval(timer);
  }, [reduceMotion]);
  useEffect(() => { scroll.current?.scrollToEnd({ animated: !reduceMotion }); }, [count, reduceMotion]);

  const skin = skinId ? SKINS[skinId] : undefined;
  const radius = Math.round(16 * (skin?.radiusScale ?? 1));
  const pad = Math.round(10 * (skin?.spacingScale ?? 1));
  const font = tokens.typography.sans;
  const size = scaledFontSize(14, tokens.typography.scale);
  const bubble = (role: 'user' | 'assistant') => role === 'user'
    ? { alignSelf: 'flex-end' as const, backgroundColor: tokens.palette.primary }
    : { alignSelf: 'flex-start' as const, backgroundColor: skin ? `rgba(255,255,255,${(1 - skin.panelAlpha) * 0.3 + 0.08})` : palette.surface, borderColor: skin ? `rgba(255,255,255,${skin.borderAlpha})` : palette.border, borderWidth: 1 };
  const colors = background ? [background.colorBack, background.colorB, background.colorA] as const : [palette.background, palette.background, palette.background] as const;

  return (
    <View testID={testID} accessibilityLabel={t('onboarding:look.previewLabel')} style={[styles.frame, { borderColor: palette.border, borderRadius: radius + 4 }]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <ScrollView ref={scroll} scrollEnabled={false} contentContainerStyle={[styles.list, { gap: pad }]} showsVerticalScrollIndicator={false}>
        {MESSAGES.slice(0, count).map((key) => {
          const role = key.startsWith('user') ? 'user' : 'assistant';
          return (
            <Animated.View key={key} entering={reduceMotion ? undefined : FadeInDown.duration(320)}
              style={[styles.bubble, bubble(role), { borderRadius: radius, padding: pad }]}>
              <Text style={{ color: role === 'user' ? '#ffffff' : tokens.palette.text, fontFamily: font, fontSize: size, lineHeight: Math.round(size * 1.35) }}>
                {t(`onboarding:look.preview.${key}`)}
              </Text>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderWidth: 1, height: 220, overflow: 'hidden' },
  list: { padding: 12 },
  bubble: { maxWidth: '82%' },
});
