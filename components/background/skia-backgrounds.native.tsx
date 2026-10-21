/**
 * Animated Skia backgrounds, ported from 21st.dev web components:
 *  - PathsBackground: Kokonut UI "Background Paths" (two mirrored fans of flowing bezier lines)
 *  - LiquidBackground: "liquid Shader" by Freedom (soft blue/violet glowing liquid blobs)
 *  - SwirlBackground: Ali Imam "Swirl" (4x4 Bayer-dithered pixel swirl, cyan on dark plum)
 * Shaders are drawn at half resolution and scaled up to keep fill cost low on mid-range Android.
 */
import { Blur, Canvas, Fill, Group, Paint, Path, Shader, Skia, useClock, type Uniforms } from '@shopify/react-native-skia';
import * as React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import type { BackgroundSettings } from '@/lib/backgrounds/settings';

export type SkiaBackgroundProps = { settings: BackgroundSettings; width?: number; height?: number };

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function useSize(width?: number, height?: number) {
  const win = useWindowDimensions();
  return { w: width ?? win.width, h: height ?? win.height };
}

function Layer({ settings, children }: { settings: BackgroundSettings; children: React.ReactNode }) {
  return (
    <Group opacity={settings.opacity} layer={settings.blur > 0 ? <Paint><Blur blur={settings.blur} /></Paint> : undefined}>
      {children}
    </Group>
  );
}

// ---------- Background Paths ----------
function kokonutPath(i: number, position: number) {
  const p = (v: number) => v.toFixed(1);
  const x = (base: number) => p(base - i * 5 * position);
  return `M-${x(380)} -${p(189 + i * 6)}C-${x(380)} -${p(189 + i * 6)} -${x(312)} ${p(216 - i * 6)} ${x(152)} ${p(343 - i * 6)}C${x(616)} ${p(470 - i * 6)} ${x(684)} ${p(875 - i * 6)} ${x(684)} ${p(875 - i * 6)}`;
}

function FlowingPath({ d, index, count, clock, settings }: { d: string; index: number; count: number; clock: SharedValue<number>; settings: BackgroundSettings }) {
  const path = React.useMemo(() => Skia.Path.MakeFromSVGString(d) ?? Skia.Path.Make(), [d]);
  const duration = 20000 + ((index * 7919) % 10000);
  const speed = Math.max(0.05, settings.speed);
  const phase = useDerivedValue(() => ((clock.value * speed) / duration + index / count) % 1);
  const start = useDerivedValue(() => { const t = phase.value; return Math.max(0, t - 0.35 - 0.35 * Math.sin(t * Math.PI)); });
  const end = useDerivedValue(() => Math.min(1, phase.value + 0.3));
  return (
    <Path
      path={path}
      style="stroke"
      strokeWidth={0.5 + index * 0.03}
      color={index % 3 === 0 ? settings.colorB : settings.colorA}
      opacity={(0.1 + index * 0.03) * (0.4 + settings.intensity)}
      start={start}
      end={end}
    />
  );
}

export function PathsBackground({ settings, width, height }: SkiaBackgroundProps) {
  const { w, h } = useSize(width, height);
  const clock = useClock();
  const count = Math.round(12 + settings.density * 24);
  const scale = Math.max(w / 696, h / 316);
  return (
    <Canvas style={{ width: w, height: h }}>
      <Fill color={settings.colorBack} />
      <Layer settings={settings}>
        <Group transform={[{ translateX: (w - 696 * scale) / 2 }, { translateY: (h - 316 * scale) / 2 }, { scale }]}>
          {[1, -1].flatMap((position) => Array.from({ length: count }, (_, i) => (
            <FlowingPath key={`${position}:${i}`} d={kokonutPath(i, position)} index={i} count={count} clock={clock} settings={settings} />
          )))}
        </Group>
      </Layer>
    </Canvas>
  );
}

// ---------- Shader helpers ----------
function HalfResShaderCanvas({ effect, uniforms, w, h, settings }: {
  effect: ReturnType<typeof Skia.RuntimeEffect.Make>;
  uniforms: React.ComponentProps<typeof Shader>['uniforms'];
  w: number; h: number; settings: BackgroundSettings;
}) {
  if (!effect) return null;
  const hw = Math.ceil(w / 2);
  const hh = Math.ceil(h / 2);
  return (
    <View style={{ width: w, height: h, overflow: 'hidden' }}>
      <Canvas style={{ position: 'absolute', left: (w - hw) / 2, top: (h - hh) / 2, width: hw, height: hh, transform: [{ scale: 2 }] }}>
        <Layer settings={settings}>
          <Fill><Shader source={effect} uniforms={uniforms} /></Fill>
        </Layer>
      </Canvas>
    </View>
  );
}

// ---------- Liquid ----------
const LIQUID_SKSL = `
uniform float2 res; uniform float time; uniform float3 colA; uniform float3 colB; uniform float3 colBack;
uniform float intensity; uniform float blobs;
half4 main(float2 pos) {
  float2 uv = (pos - 0.5 * res) / min(res.x, res.y);
  float field = 0.0; float mixv = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    if (fi >= blobs) break;
    float2 c = 0.42 * float2(sin(time * (0.31 + 0.07 * fi) + fi * 1.7), cos(time * (0.27 + 0.05 * fi) + fi * 2.3));
    float r = 0.18 + 0.05 * sin(time * 0.5 + fi);
    float f = r * r / (dot(uv - c, uv - c) + 1e-3);
    field += f; mixv += f * (0.5 + 0.5 * sin(fi * 1.3));
  }
  float t = mixv / max(field, 1e-3);
  float3 blob = mix(colA, colB, t);
  float core = smoothstep(0.9, 1.6, field);
  float glow = clamp(field * 0.35, 0.0, 1.0) * (0.4 + intensity);
  float3 col = colBack + blob * glow * 0.6 + blob * core * (0.5 + 0.5 * intensity);
  return half4(half3(clamp(col, 0.0, 1.0)), 1.0);
}`;

export function LiquidBackground({ settings, width, height }: SkiaBackgroundProps) {
  const { w, h } = useSize(width, height);
  const effect = React.useMemo(() => Skia.RuntimeEffect.Make(LIQUID_SKSL), []);
  const clock = useClock();
  const a = rgb(settings.colorA); const b = rgb(settings.colorB); const back = rgb(settings.colorBack);
  const { speed, intensity, density } = settings;
  const uniforms = useDerivedValue<Uniforms>(() => ({
    res: [Math.ceil(w / 2), Math.ceil(h / 2)], time: (clock.value / 1000) * speed,
    colA: a, colB: b, colBack: back, intensity, blobs: 2 + Math.round(density * 4),
  }));
  return <HalfResShaderCanvas effect={effect} uniforms={uniforms} w={w} h={h} settings={settings} />;
}

// ---------- Swirl (dithered) ----------
const SWIRL_SKSL = `
uniform float2 res; uniform float time; uniform float3 colFront; uniform float3 colBack;
uniform float pxSize; uniform float intensity;
float bayer2(float2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(float2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
half4 main(float2 pos) {
  float2 cell = floor(pos / pxSize);
  float2 p = cell * pxSize + 0.5 * pxSize;
  float2 uv = (p - 0.5 * res) / min(res.x, res.y);
  float l = length(uv);
  float a = atan(uv.y, uv.x);
  float swirl = sin(a * 3.0 + 10.0 * pow(l, 0.6) - time * 2.0);
  float shape = 0.5 + 0.5 * swirl;
  shape *= smoothstep(1.1, 0.05, l);
  shape = pow(shape, 1.6 - intensity);
  float threshold = bayer4(cell) - 0.5;
  float on = step(0.5, shape + threshold);
  return half4(half3(mix(colBack, colFront, on)), 1.0);
}`;

export function SwirlBackground({ settings, width, height }: SkiaBackgroundProps) {
  const { w, h } = useSize(width, height);
  const effect = React.useMemo(() => Skia.RuntimeEffect.Make(SWIRL_SKSL), []);
  const clock = useClock();
  const front = rgb(settings.colorA); const back = rgb(settings.colorBack);
  const { speed, intensity, density } = settings;
  // Full-res pxSize 2..8 -> half-res canvas units 1..4.
  const pxSize = 1 + Math.round(density * 3);
  const uniforms = useDerivedValue<Uniforms>(() => ({
    res: [Math.ceil(w / 2), Math.ceil(h / 2)], time: (clock.value / 1000) * speed, colFront: front, colBack: back, pxSize, intensity,
  }));
  return <HalfResShaderCanvas effect={effect} uniforms={uniforms} w={w} h={h} settings={settings} />;
}

export const SKIA_BACKGROUNDS = { paths: PathsBackground, liquid: LiquidBackground, swirl: SwirlBackground } as const;
