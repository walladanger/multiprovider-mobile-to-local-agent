/**
 * Animated Skia backgrounds, ported from 21st.dev web components:
 *  - PathsBackground: Kokonut UI FloatingPathsBackground (faithful port of the supplied source)
 *  - CyberBackground: FluidParticlesBackground / CyberBackground (Perlin particle field, supplied source)
 *  - MeshGradientBackground: drifting color blobs from N stops (data presets in lib/backgrounds/mesh-presets.ts)
 *  - LiquidBackground: "liquid Shader" by Freedom (soft blue/violet glowing liquid blobs)
 *  - SwirlBackground: Ali Imam "Swirl" (4x4 Bayer-dithered pixel swirl, cyan on dark plum)
 * Shaders are drawn at half resolution and scaled up to keep fill cost low on mid-range Android.
 */
import { Blur, Canvas, Circle, Fill, Group, Paint, Path, RadialGradient, Shader, Skia, useClock, vec, type SkPath, type Uniforms } from '@shopify/react-native-skia';
import * as React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useDerivedValue, useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { kokonutPath, stepParticles } from '@/lib/backgrounds/background-math';
import { SHADER_KINDS, SHADER_SOURCES, shaderUniforms, type ShaderKind } from '@/lib/backgrounds/shader-sources';
import type { BackgroundSettings, MeshStop } from '@/lib/backgrounds/settings';

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

// ---------- Background Paths (Kokonut UI FloatingPathsBackground) ----------
// Same path math, stroke widths and stroke opacities as the original; the motion/react
// animation (pathLength 0.3 -> 1, opacity [0.3, 0.6, 0.3], pathOffset [0, 1, 0],
// linear, 20-30 s, repeat) is reproduced per path from a shared clock.
const PATH_COUNT = 36;

/** Deterministic stand-in for the original's `20 + Math.random() * 10` seconds. */
function pathDurationMs(i: number, position: number) {
  const r = Math.abs(Math.sin((i + 1) * 12.9898 + position * 78.233) * 43758.5453) % 1;
  return (20 + r * 10) * 1000;
}

function FloatingPath({ i, position, clock, settings }: { i: number; position: number; clock: SharedValue<number>; settings: BackgroundSettings }) {
  const path = React.useMemo(() => Skia.Path.MakeFromSVGString(kokonutPath(i, position)) ?? Skia.Path.Make(), [i, position]);
  const duration = pathDurationMs(i, position) / Math.max(0.05, settings.speed);
  const progress = useDerivedValue(() => (clock.value % duration) / duration);
  // pathOffset [0, 1, 0] and pathLength 0.3 -> 1 over one cycle.
  const start = useDerivedValue(() => { const p = progress.value; return Math.min(1, p < 0.5 ? p * 2 : 2 - p * 2); });
  const end = useDerivedValue(() => { const p = progress.value; return Math.min(1, start.value + 0.3 + 0.7 * p); });
  const strokeOpacity = Math.min(1, 0.1 + i * 0.03);
  const opacity = useDerivedValue(() => { const p = progress.value; return strokeOpacity * (p < 0.5 ? 0.3 + 0.6 * p : 0.9 - 0.6 * p) * (0.5 + settings.intensity); });
  return <Path path={path} style="stroke" strokeWidth={0.5 + i * 0.03} color={settings.colorA} opacity={opacity} start={start} end={end} />;
}

export function PathsBackground({ settings, width, height }: SkiaBackgroundProps) {
  const { w, h } = useSize(width, height);
  const clock = useClock();
  // Original viewBox 0 0 696 316 with preserveAspectRatio xMidYMid meet.
  const scale = Math.min(w / 696, h / 316) * (h > w ? 2.2 : 1);
  const positions = settings.position === 0 ? [1, -1] : [settings.position];
  const count = Math.max(6, Math.round(PATH_COUNT * (0.25 + 0.75 * settings.density)));
  return (
    <Canvas style={{ width: w, height: h }}>
      <Fill color={settings.colorBack} />
      <Layer settings={settings}>
        <Group transform={[{ translateX: (w - 696 * scale) / 2 }, { translateY: (h - 316 * scale) / 2 }, { scale }]}>
          {positions.flatMap((position) => Array.from({ length: count }, (_, i) => (
            <FloatingPath key={`${position}:${i}`} i={i} position={position} clock={clock} settings={settings} />
          )))}
        </Group>
      </Layer>
    </Canvas>
  );
}

// ---------- Cyber particles (FluidParticlesBackground / "CyberBackground") ----------
// Perlin-noise flow field: angle = noise(x*f, y*f, t*0.0001) * 4PI, speed 2 px/frame,
// life fade sin(life/maxLife*PI)*0.15, wrap at edges, respawn after maxLife.
// The original's trail (12% background fill per frame) is approximated with a short
// stroke along the velocity. Simulation runs on the UI thread, capped at 30 fps.
const OPACITY_BUCKETS = 4;

export function CyberBackground({ settings, width, height }: SkiaBackgroundProps) {
  const { w, h } = useSize(width, height);
  const { particleCount, noiseIntensity, particleSizeMin, particleSizeMax, speed } = settings;
  // [x, y, size, life, maxLife] per particle.
  const state = useSharedValue<number[]>([]);
  const paths = useSharedValue<SkPath[]>([]);
  const last = useSharedValue(0);
  React.useEffect(() => {
    const arr: number[] = [];
    for (let i = 0; i < particleCount; i++) arr.push(Math.random() * w, Math.random() * h, Math.random() * (particleSizeMax - particleSizeMin) + particleSizeMin, Math.random() * 100, 100 + Math.random() * 50);
    state.value = arr;
  }, [particleCount, particleSizeMin, particleSizeMax, w, h, state]);

  useFrameCallback((frame) => {
    'worklet';
    if (frame.timestamp - last.value < 33) return; // ~30 fps
    const steps = Math.min(3, Math.max(1, Math.round((frame.timestamp - last.value) / 16.7))) * speed;
    last.value = frame.timestamp;
    const buckets: SkPath[] = [];
    for (let b = 0; b < OPACITY_BUCKETS; b++) buckets.push(Skia.Path.Make());
    stepParticles(state.value, steps, frame.timestamp * 0.0001 * speed, w, h, noiseIntensity, buckets);
    paths.value = buckets;
  });

  const p0 = useDerivedValue(() => paths.value[0] ?? Skia.Path.Make());
  const p1 = useDerivedValue(() => paths.value[1] ?? Skia.Path.Make());
  const p2 = useDerivedValue(() => paths.value[2] ?? Skia.Path.Make());
  const p3 = useDerivedValue(() => paths.value[3] ?? Skia.Path.Make());
  // Original peak alpha is 0.15; intensity scales it up to ~0.45 for small screens.
  const peak = 0.15 * (0.5 + settings.intensity * 2.5);
  const strokeW = (particleSizeMin + particleSizeMax) / 2;
  return (
    <Canvas style={{ width: w, height: h }}>
      <Fill color={settings.colorBack} />
      <Layer settings={settings}>
        {[p0, p1, p2, p3].map((p, b) => (
          <Path key={b} path={p} style="stroke" strokeWidth={strokeW} strokeCap="round" color={settings.colorA} opacity={peak * ((b + 0.5) / OPACITY_BUCKETS)} />
        ))}
      </Layer>
    </Canvas>
  );
}

// ---------- Mesh gradient ----------
function MeshBlob({ stop, index, w, h, clock, speed }: { stop: MeshStop; index: number; w: number; h: number; clock: SharedValue<number>; speed: number }) {
  const r = stop.radius * Math.max(w, h);
  const cx = useDerivedValue(() => (stop.x + stop.driftX * Math.sin((clock.value / 1000) * 0.2 * stop.speed * speed + index * 1.7)) * w);
  const cy = useDerivedValue(() => (stop.y + stop.driftY * Math.cos((clock.value / 1000) * 0.17 * stop.speed * speed + index * 2.3)) * h);
  const center = useDerivedValue(() => vec(cx.value, cy.value));
  return (
    <Circle cx={cx} cy={cy} r={r}>
      <RadialGradient c={center} r={r} colors={[stop.color, `${stop.color}00`]} />
    </Circle>
  );
}

export function MeshGradientBackground({ settings, width, height }: SkiaBackgroundProps) {
  const { w, h } = useSize(width, height);
  const clock = useClock();
  return (
    <Canvas style={{ width: w, height: h }}>
      <Fill color={settings.colorBack} />
      <Group opacity={settings.opacity} layer={settings.blur > 0 ? <Paint><Blur blur={settings.blur} /></Paint> : undefined}>
        {settings.stops.map((stop, i) => <MeshBlob key={i} stop={stop} index={i} w={w} h={h} clock={clock} speed={settings.speed} />)}
      </Group>
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

// ---------- Code-only shader presets (lib/backgrounds/shader-sources.ts) ----------
function makeShaderBackground(kind: ShaderKind) {
  return function ShaderBackground({ settings, width, height }: SkiaBackgroundProps) {
    const { w, h } = useSize(width, height);
    const effect = React.useMemo(() => Skia.RuntimeEffect.Make(SHADER_SOURCES[kind]), []);
    const clock = useClock();
    const hw = Math.ceil(w / 2);
    const hh = Math.ceil(h / 2);
    const base = React.useMemo(() => shaderUniforms(kind, settings, hw, hh), [settings, hw, hh]);
    const speed = settings.speed;
    const uniforms = useDerivedValue<Uniforms>(() => ({ ...base, time: (clock.value / 1000) * speed }));
    return <HalfResShaderCanvas effect={effect} uniforms={uniforms} w={w} h={h} settings={settings} />;
  };
}

export const SKIA_BACKGROUNDS = {
  ...Object.fromEntries(SHADER_KINDS.map((k) => [k, makeShaderBackground(k)])) as Record<ShaderKind, ReturnType<typeof makeShaderBackground>>, paths: PathsBackground, liquid: LiquidBackground, swirl: SwirlBackground, cyber: CyberBackground, mesh: MeshGradientBackground } as const;
