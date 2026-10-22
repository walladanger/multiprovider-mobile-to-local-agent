/**
 * Animated Skia backgrounds, ported from 21st.dev web components plus our own styles:
 *  - PathsBackground: Kokonut UI FloatingPathsBackground (faithful port of the supplied source)
 *  - CyberBackground: FluidParticlesBackground / CyberBackground (Perlin particle field, supplied source)
 *  - MeshGradientBackground: drifting color blobs from N stops (data presets in lib/backgrounds/mesh-presets.ts)
 *  - Shader styles (lib/backgrounds/shader-sources.ts): liquid, swirl, prism, halftone, papermesh, hive, waves, starfield, plasma
 *  - BallsBackground: aurora, 3-ball gradient, bounce, orbit, repel; physics in lib/backgrounds/ball-physics.ts
 * Shaders are drawn at half resolution and scaled up to keep fill cost low on mid-range Android.
 * Every style reads the unified parameters (see lib/backgrounds/params.ts).
 */
import { Blur, BlurMask, Canvas, Circle, Fill, Group, Paint, Path, RadialGradient, Shader, Skia, useClock, vec, type SkPath, type Uniforms } from '@shopify/react-native-skia';
import * as React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useDerivedValue, useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { kokonutPath, stepParticles } from '@/lib/backgrounds/background-math';
import { ballCount, ballUniforms, initBalls, stepBalls, type BallMode } from '@/lib/backgrounds/ball-physics';
import { invertHex } from '@/lib/backgrounds/color-math';
import { BALL_KINDS, BALLS_SOURCE, ballStaticUniforms, SHADER_KINDS, SHADER_SOURCES, shaderUniforms, type ShaderKind } from '@/lib/backgrounds/shader-sources';
import type { BackgroundSettings, MeshStop } from '@/lib/backgrounds/settings';

export type SkiaBackgroundProps = { settings: BackgroundSettings; width?: number; height?: number };

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

function FloatingPath({ i, position, clock, settings, color }: { i: number; position: number; clock: SharedValue<number>; settings: BackgroundSettings; color: string }) {
  const path = React.useMemo(() => Skia.Path.MakeFromSVGString(kokonutPath(i, position)) ?? Skia.Path.Make(), [i, position]);
  // Chaos spreads the cycle lengths and adds a sideways wobble; 0 = the original timing.
  const jitter = 1 + settings.chaos * (Math.abs(Math.sin((i + 3) * 7.13 + position)) - 0.5);
  const duration = (pathDurationMs(i, position) * jitter) / Math.max(0.05, settings.speed);
  const progress = useDerivedValue(() => (clock.value % duration) / duration);
  // pathOffset [0, 1, 0] and pathLength 0.3 -> 1 over one cycle.
  const start = useDerivedValue(() => { const p = progress.value; return Math.min(1, p < 0.5 ? p * 2 : 2 - p * 2); });
  const end = useDerivedValue(() => { const p = progress.value; return Math.min(1, start.value + 0.3 + 0.7 * p); });
  const strokeOpacity = Math.min(1, 0.1 + i * 0.03);
  const { glow, chaos, intensity } = settings;
  // Glow: strokes shimmer as they sweep across neighbors (brightest mid-cycle, where the fans cross).
  const opacity = useDerivedValue(() => {
    const p = progress.value;
    const base = strokeOpacity * (p < 0.5 ? 0.3 + 0.6 * p : 0.9 - 0.6 * p) * (0.5 + intensity);
    const shimmer = glow > 0 ? 1 + glow * 1.6 * Math.max(0, Math.sin(p * Math.PI * 6 + i)) * Math.sin(p * Math.PI) : 1;
    return Math.min(1, base * shimmer);
  });
  const transform = useDerivedValue(() => [{ translateX: chaos * 14 * Math.sin(clock.value / 900 + i * 1.3) }, { translateY: chaos * 10 * Math.cos(clock.value / 1100 + i * 0.7) }]);
  return (
    <Group transform={transform}>
      <Path path={path} style="stroke" strokeWidth={0.5 + i * 0.03} color={color} opacity={opacity} start={start} end={end}>
        {glow > 0.05 && i % 3 === 0 ? <BlurMask blur={glow * 4} style="solid" /> : null}
      </Path>
    </Group>
  );
}

export function PathsBackground({ settings, width, height }: SkiaBackgroundProps) {
  const { w, h } = useSize(width, height);
  const clock = useClock();
  // Original viewBox 0 0 696 316 with preserveAspectRatio xMidYMid meet.
  const scale = Math.min(w / 696, h / 316) * (h > w ? 2.2 : 1) * (0.75 + 0.5 * settings.scale);
  const positions = settings.position === 0 ? [1, -1] : [settings.position];
  const count = Math.max(6, Math.round(PATH_COUNT * (0.25 + 0.75 * settings.density)));
  const fanColor = (position: number) => invertHex(settings.layerColors[position === -1 ? 1 : 0] ?? settings.colorA, settings.invert);
  return (
    <Canvas style={{ width: w, height: h }}>
      <Fill color={invertHex(settings.colorBack, settings.invert)} />
      <Layer settings={settings}>
        <Group transform={[{ translateX: (w - 696 * scale) / 2 }, { translateY: (h - 316 * scale) / 2 }, { scale }]}>
          {positions.flatMap((position) => Array.from({ length: count }, (_, i) => (
            <FloatingPath key={`${position}:${i}`} i={i} position={position} clock={clock} settings={settings} color={fanColor(position)} />
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
  const { noiseIntensity, speed, chaos, glow } = settings;
  // Density scales the configured count (x1 at the default 0.5); scale scales particle size.
  const particleCount = Math.min(1200, Math.max(50, Math.round(settings.particleCount * (0.25 + 1.5 * settings.density))));
  const sizeK = 0.5 + settings.scale;
  const particleSizeMin = settings.particleSizeMin * sizeK;
  const particleSizeMax = settings.particleSizeMax * sizeK;
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
    stepParticles(state.value, steps, frame.timestamp * 0.0001 * speed, w, h, noiseIntensity, buckets, chaos);
    paths.value = buckets;
  });

  const p0 = useDerivedValue(() => paths.value[0] ?? Skia.Path.Make());
  const p1 = useDerivedValue(() => paths.value[1] ?? Skia.Path.Make());
  const p2 = useDerivedValue(() => paths.value[2] ?? Skia.Path.Make());
  const p3 = useDerivedValue(() => paths.value[3] ?? Skia.Path.Make());
  // Original peak alpha is 0.15; intensity scales it up to ~0.45 for small screens.
  const peak = 0.15 * (0.5 + settings.intensity * 2.5);
  const strokeW = (particleSizeMin + particleSizeMax) / 2;
  const colors = [0, 1, 2, 3].map((b) => invertHex(settings.layerColors[b] ?? settings.colorA, settings.invert));
  // Glow: the brightest layer shimmers with a soft halo (one extra blurred pass, only when glow is on).
  const shimmer = useDerivedValue(() => (glow > 0 ? glow * (0.55 + 0.45 * Math.sin(last.value / 140)) : 0));
  return (
    <Canvas style={{ width: w, height: h }}>
      <Fill color={invertHex(settings.colorBack, settings.invert)} />
      <Layer settings={settings}>
        {[p0, p1, p2, p3].map((p, b) => (
          <Path key={b} path={p} style="stroke" strokeWidth={strokeW} strokeCap="round" color={colors[b]} opacity={peak * ((b + 0.5) / OPACITY_BUCKETS)} />
        ))}
        {glow > 0.02 ? (
          <Path path={p3} style="stroke" strokeWidth={strokeW * 3} strokeCap="round" color={colors[3]} opacity={shimmer}>
            <BlurMask blur={2 + glow * 6} style="normal" />
          </Path>
        ) : null}
      </Layer>
    </Canvas>
  );
}

// ---------- Mesh gradient ----------
function MeshBlob({ stop, index, w, h, clock, settings }: { stop: MeshStop; index: number; w: number; h: number; clock: SharedValue<number>; settings: BackgroundSettings }) {
  const { speed, chaos } = settings;
  const r = stop.radius * Math.max(w, h) * (0.6 + 0.8 * settings.scale);
  const color = invertHex(stop.color, settings.invert);
  // Chaos adds a faster, uncorrelated second drift on top of the calm original drift.
  const cx = useDerivedValue(() => { const t = (clock.value / 1000) * speed; return (stop.x + stop.driftX * Math.sin(t * 0.2 * stop.speed + index * 1.7) + chaos * 0.12 * Math.sin(t * 0.93 + index * 4.1)) * w; });
  const cy = useDerivedValue(() => { const t = (clock.value / 1000) * speed; return (stop.y + stop.driftY * Math.cos(t * 0.17 * stop.speed + index * 2.3) + chaos * 0.12 * Math.cos(t * 0.71 + index * 3.3)) * h; });
  const center = useDerivedValue(() => vec(cx.value, cy.value));
  return (
    <Circle cx={cx} cy={cy} r={r}>
      <RadialGradient c={center} r={r} colors={[color, `${color}00`]} />
    </Circle>
  );
}

export function MeshGradientBackground({ settings, width, height }: SkiaBackgroundProps) {
  const { w, h } = useSize(width, height);
  const clock = useClock();
  return (
    <Canvas style={{ width: w, height: h }}>
      <Fill color={invertHex(settings.colorBack, settings.invert)} />
      <Group opacity={settings.opacity} layer={settings.blur > 0 ? <Paint><Blur blur={settings.blur} /></Paint> : undefined}>
        {settings.stops.map((stop, i) => <MeshBlob key={i} stop={stop} index={i} w={w} h={h} clock={clock} settings={settings} />)}
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

// ---------- Shader styles (lib/backgrounds/shader-sources.ts) ----------
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

// ---------- Light balls (aurora, 3-ball gradient, bounce, orbit, repel) ----------
// The simulation (a handful of balls) steps on the UI thread every frame; only uniforms cross to Skia.
let ballsEffect: ReturnType<typeof Skia.RuntimeEffect.Make> | undefined;
function makeBallsBackground(mode: BallMode) {
  return function BallsBackground({ settings, width, height }: SkiaBackgroundProps) {
    const { w, h } = useSize(width, height);
    const effect = React.useMemo(() => {
      ballsEffect ??= Skia.RuntimeEffect.Make(BALLS_SOURCE) ?? undefined;
      return ballsEffect ?? null;
    }, []);
    const hw = Math.ceil(w / 2);
    const hh = Math.ceil(h / 2);
    const m = Math.min(hw, hh);
    const ax = (0.5 * hw) / m;
    const ay = (0.5 * hh) / m;
    const n = ballCount(mode, settings.density);
    const { speed, scale, chaos } = settings;
    const base = React.useMemo(() => ballStaticUniforms(mode, settings, hw, hh, n), [settings, hw, hh, n]);
    const sim = useSharedValue(initBalls(mode, ax, ay));
    const frameU = useSharedValue(ballUniforms(sim.value, mode, n, scale));
    const time = useSharedValue(0);
    useFrameCallback((frame) => {
      'worklet';
      const dt = Math.min(0.05, (frame.timeSincePreviousFrame ?? 16) / 1000) * speed;
      time.value += dt;
      const s = sim.value;
      stepBalls(s, mode, n, dt, ax, ay, scale, chaos);
      frameU.value = ballUniforms(s, mode, n, scale);
    });
    const uniforms = useDerivedValue<Uniforms>(() => ({ ...base, ...frameU.value, time: time.value }));
    return <HalfResShaderCanvas effect={effect} uniforms={uniforms} w={w} h={h} settings={settings} />;
  };
}

export const SKIA_BACKGROUNDS = {
  ...Object.fromEntries(SHADER_KINDS.map((k) => [k, makeShaderBackground(k)])) as Record<ShaderKind, ReturnType<typeof makeShaderBackground>>,
  ...Object.fromEntries(BALL_KINDS.map((k) => [k, makeBallsBackground(k)])) as Record<BallMode, ReturnType<typeof makeBallsBackground>>,
  paths: PathsBackground, cyber: CyberBackground, mesh: MeshGradientBackground,
} as const;
