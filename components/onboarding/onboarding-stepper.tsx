import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { tokens } from '@/theme/tokens';
import { getStepperModel, ONBOARDING_STEP_ICONS, type OnboardingStepName, type StepperDotState } from './navigation';

const DOT = 28;
const BAR = 10;
const SHEEN = 60;

/** Start → finish gradient: dim and cool at the start, bright and saturated at the end. */
export function progressGradient(palette: { bgRaised: string; primary: string; primarySoft: string; accent: string }) {
  return [palette.bgRaised, palette.primary, palette.primarySoft, palette.accent] as const;
}

function Dot({ name, number, state, accent, palette, reduceMotion }: {
  name: OnboardingStepName; number: number; state: StepperDotState; accent: string; palette: typeof Colors.light; reduceMotion: boolean;
}) {
  const current = state === 'current';
  const scale = useSharedValue(current ? 1.18 : 1);
  useEffect(() => {
    const target = current ? 1.18 : 1;
    scale.value = reduceMotion ? target : withSpring(target, { damping: 14, stiffness: 180 });
  }, [current, reduceMotion, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const filled = state !== 'upcoming';
  return (
    <Animated.View
      testID={`onboarding-stepper-dot-${name}`}
      style={[styles.dot, style, {
        backgroundColor: filled ? accent : palette.surface,
        borderColor: filled ? accent : palette.border,
        shadowColor: accent,
        shadowOpacity: current ? 0.7 : 0,
        shadowRadius: current ? 10 : 0,
        elevation: current ? 8 : 0,
      }]}>
      {state === 'done'
        ? <MaterialCommunityIcons name="check" size={16} color="#ffffff" />
        : current
          ? <MaterialCommunityIcons name={ONBOARDING_STEP_ICONS[name] as never} size={16} color="#ffffff" />
          : <Text style={[styles.number, { color: palette.muted }]}>{number}</Text>}
    </Animated.View>
  );
}

/**
 * Visual stepper: one dot per step joined by a line, completed dots checked,
 * the current dot glowing in the accent color, and the step title below.
 */
export function OnboardingStepper({ steps, current }: { steps: readonly OnboardingStepName[]; current: OnboardingStepName }) {
  const { t } = useTranslation();
  const palette = Colors[useColorScheme() ?? 'light'];
  const reduceMotion = useReducedMotion();
  const model = getStepperModel(steps, current);
  const index = Math.max(0, steps.indexOf(current));
  const title = t(`onboarding:steps.${current}`);
  const fill = useSharedValue(steps.length > 1 ? index / (steps.length - 1) : 1);
  useEffect(() => {
    const target = steps.length > 1 ? index / (steps.length - 1) : 1;
    fill.value = reduceMotion ? target : withTiming(target, { duration: 350 });
  }, [fill, index, reduceMotion, steps.length]);
  const [trackWidth, setTrackWidth] = useState(0);
  const fillStyle = useAnimatedStyle(() => ({ width: Math.max(BAR, fill.value * trackWidth) }));
  const sheen = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) { cancelAnimation(sheen); sheen.value = 0; return; }
    sheen.value = 0;
    sheen.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }), -1, false);
    return () => cancelAnimation(sheen);
  }, [reduceMotion, sheen]);
  const sheenStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0 : 1,
    transform: [{ translateX: -SHEEN + sheen.value * (fill.value * trackWidth + SHEEN) }],
  }));
  const colors = progressGradient(tokens.palette);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('onboarding:stepIndicatorLabel', { step: index + 1, totalSteps: steps.length, title })}
      accessibilityValue={{ min: 1, max: steps.length, now: index + 1 }}
      testID="onboarding-stepper"
      style={styles.wrap}>
      <View style={styles.track}>
        <View style={[styles.line, { backgroundColor: palette.border }]} />
        <View style={styles.dots}>
          {model.map((dot) => <Dot key={dot.name} {...dot} accent={palette.tint} palette={palette} reduceMotion={reduceMotion} />)}
        </View>
      </View>
      <View testID="onboarding-progress-bar" style={[styles.bar, { backgroundColor: palette.border }]} onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}>
        <Animated.View testID="onboarding-progress-fill" style={[styles.barFill, fillStyle]}>
          <LinearGradient colors={colors} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[styles.barGradient, { width: trackWidth || '100%' }]} />
          <Animated.View pointerEvents="none" style={[styles.sheen, sheenStyle]}>
            <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </Animated.View>
      </View>
      <Text variant="labelMedium" style={{ color: palette.muted }}>{t('onboarding:stepIndicator', { step: index + 1, totalSteps: steps.length })}</Text>
      <Text testID="onboarding-stepper-title" variant="titleLarge" style={[styles.title, { color: palette.text }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, paddingHorizontal: 20, paddingBottom: 10, paddingTop: 6 },
  track: { height: DOT + 8, justifyContent: 'center' },
  line: { position: 'absolute', left: DOT / 2, right: DOT / 2, height: 2, borderRadius: 1, opacity: 0.6 },
  bar: { borderRadius: BAR / 2, height: BAR, overflow: 'hidden', width: '100%' },
  barFill: { borderRadius: BAR / 2, height: BAR, overflow: 'hidden' },
  barGradient: { height: BAR, left: 0, position: 'absolute', top: 0 },
  sheen: { height: BAR, left: 0, position: 'absolute', top: 0, width: SHEEN },
  dots: { flexDirection: 'row', justifyContent: 'space-between' },
  dot: { alignItems: 'center', borderRadius: DOT / 2, borderWidth: 2, height: DOT, justifyContent: 'center', shadowOffset: { width: 0, height: 0 }, width: DOT },
  number: { fontFamily: Fonts.sans, fontSize: 12, fontWeight: '700' },
  title: { fontFamily: Fonts.display, fontWeight: '700' },
});
