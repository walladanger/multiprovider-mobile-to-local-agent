import { BlurView } from 'expo-blur';
import * as React from 'react';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { tokens } from '@/theme/tokens';

/** Frosted-glass surface: translucent indigo fill, blur, subtle white border. */
export function GlassPanel({ style, children, strong, ...props }: ViewProps & { className?: string; strong?: boolean }) {
  useColorScheme(); // re-render on live theme/skin changes
  return (
    <View style={[styles.panel, { backgroundColor: strong ? tokens.glass.panelStrong : tokens.glass.panel, borderColor: tokens.glass.border, borderRadius: tokens.radius.lg }, style]} {...props}>
      {tokens.glass.blurIntensity > 0 && (Platform.OS !== 'android' || Number(Platform.Version) >= 31) ? (
        <BlurView intensity={tokens.glass.blurIntensity} tint={tokens.glass.blurTint} style={StyleSheet.absoluteFill} />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});
