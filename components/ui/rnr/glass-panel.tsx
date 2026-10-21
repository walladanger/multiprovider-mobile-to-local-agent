import { BlurView } from 'expo-blur';
import * as React from 'react';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

import { tokens } from '@/theme/tokens';

/** Frosted-glass surface: translucent indigo fill, blur, subtle white border. */
export function GlassPanel({ style, children, strong, ...props }: ViewProps & { className?: string; strong?: boolean }) {
  return (
    <View style={[styles.panel, { backgroundColor: strong ? tokens.glass.panelStrong : tokens.glass.panel }, style]} {...props}>
      {Platform.OS !== 'android' || Number(Platform.Version) >= 31 ? (
        <BlurView intensity={tokens.glass.blurIntensity} tint={tokens.glass.blurTint} style={StyleSheet.absoluteFill} />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderColor: tokens.glass.border, borderRadius: tokens.radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});
