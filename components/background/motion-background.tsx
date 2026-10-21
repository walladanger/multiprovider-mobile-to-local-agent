import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { MOTION_BACKGROUND_SOURCE } from '@/constants/motion-background';
import { tokens } from '@/theme/tokens';

function GradientFallback() {
  return (
    <LinearGradient
      colors={[...tokens.overlay.gradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

function LoopingVideo({ source }: { source: number }) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      allowsPictureInPicture={false}
    />
  );
}

/** Full-screen background: looping muted video with an indigo tint, or a static gradient. */
export function MotionBackground({ source = MOTION_BACKGROUND_SOURCE }: { source?: number | null }) {
  const reducedMotion = useReducedMotion();
  const showVideo = source != null && !reducedMotion;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="motion-background">
      <GradientFallback />
      {showVideo ? <LoopingVideo source={source} /> : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.overlay.tint }]} />
    </View>
  );
}
