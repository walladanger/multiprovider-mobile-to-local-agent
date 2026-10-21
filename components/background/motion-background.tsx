import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as React from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { SKIA_BACKGROUNDS } from '@/components/background/skia-backgrounds';
import { MOTION_BACKGROUND_SOURCE } from '@/constants/motion-background';
import { BACKGROUND_DEFAULTS, type BackgroundKind, type BackgroundSettings } from '@/lib/backgrounds/settings';
import { useBackground } from '@/providers/background-context';
import { tokens } from '@/theme/tokens';

type LayerProps = { settings: BackgroundSettings; width?: number; height?: number; paused: boolean };

function GradientFallback({ settings }: { settings?: BackgroundSettings }) {
  const colors = settings && settings.kind === 'gradient'
    ? [settings.colorBack, settings.colorB, settings.colorA] as const
    : [...tokens.overlay.gradient] as const;
  return <LinearGradient colors={[colors[0], colors[1], colors[2]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />;
}

function LoopingVideo({ source, paused }: { source: number; paused: boolean }) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
  });
  React.useEffect(() => {
    if (paused) player.pause();
    else player.play();
  }, [paused, player]);
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} />;
}

/**
 * Background registry. Each entry renders one background kind; anything that
 * cannot render (no video file, Skia unavailable on web) falls back to the gradient.
 */
export const BACKGROUND_REGISTRY: Record<BackgroundKind, (props: LayerProps) => React.ReactNode> = {
  gradient: ({ settings }) => <GradientFallback settings={settings} />,
  video: ({ paused }) => (MOTION_BACKGROUND_SOURCE != null ? <LoopingVideo source={MOTION_BACKGROUND_SOURCE} paused={paused} /> : null),
  paths: (props) => renderSkia('paths', props),
  liquid: (props) => renderSkia('liquid', props),
  swirl: (props) => renderSkia('swirl', props),
  cyber: (props) => renderSkia('cyber', props),
  mesh: (props) => renderSkia('mesh', props),
};

function renderSkia(kind: 'paths' | 'liquid' | 'swirl' | 'cyber' | 'mesh', { settings, width, height, paused }: LayerProps) {
  const Component = SKIA_BACKGROUNDS[kind];
  // Unmounting the canvas while paused stops its frame clock entirely.
  if (!Component || paused) return null;
  return <Component settings={settings} width={width} height={height} />;
}

function useAppActive() {
  const [active, setActive] = React.useState(AppState.currentState !== 'background');
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => sub.remove();
  }, []);
  return active;
}

/** Renders one background with tint; used full-screen and for the live preview. */
export function BackgroundLayer({ settings, width, height, tint = true }: { settings: BackgroundSettings; width?: number; height?: number; tint?: boolean }) {
  const reducedMotion = useReducedMotion();
  const appActive = useAppActive();
  const animated = !reducedMotion && settings.kind !== 'gradient';
  const content = animated ? BACKGROUND_REGISTRY[settings.kind]({ settings, width, height, paused: !appActive }) : null;
  const tintAlpha = settings.kind === 'video' ? tokens.overlay.tint : `rgba(11, 10, 42, ${(0.55 * (1 - settings.intensity * 0.6)).toFixed(2)})`;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <GradientFallback settings={animated ? undefined : settings.kind === 'gradient' ? settings : BACKGROUND_DEFAULTS.gradient} />
      {content}
      {tint ? <View style={[StyleSheet.absoluteFill, { backgroundColor: tintAlpha }]} /> : null}
    </View>
  );
}

/** Full-screen app background driven by the saved Appearance settings. */
export function MotionBackground() {
  const { settings } = useBackground();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="motion-background">
      <BackgroundLayer settings={settings} />
    </View>
  );
}
