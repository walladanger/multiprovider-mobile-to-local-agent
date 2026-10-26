/** Pure model for animated background settings and named presets (no React/RN imports). */
import { normalizeAppearance, type AppearanceSettings } from './appearance';
import { hueShift } from './color-math';

export const BACKGROUND_KINDS = ['gradient', 'video', 'paths', 'liquid', 'swirl', 'cyber', 'mesh', 'prism', 'aurora', 'halftone', 'papermesh', 'hive'] as const;
export type BackgroundKind = (typeof BACKGROUND_KINDS)[number];

export type BackgroundSettings = {
  kind: BackgroundKind;
  /** Primary / foreground color. */
  colorA: string;
  /** Secondary color. */
  colorB: string;
  /** Background / base color. */
  colorBack: string;
  /** Animation speed multiplier, 0..2. */
  speed: number;
  /** Line count, dot size, or blob count depending on kind; 0..1. */
  density: number;
  /** Glow / contrast; 0..1. */
  intensity: number;
  /** Blur in px applied to the layer, 0..20. */
  blur: number;
  /** Layer opacity, 0..1. */
  opacity: number;
  /** Floating paths: 1 or -1 draws one fan (the original `position` prop); 0 draws both mirrored fans. */
  position: number;
  /** Cyber particles: particle count (original default 2000; capped for mobile). */
  particleCount: number;
  /** Cyber particles: Perlin noise frequency (original `noiseIntensity`, default 0.003). */
  noiseIntensity: number;
  /** Cyber particles: radius range in px (original `particleSize` {min,max}). */
  particleSizeMin: number;
  particleSizeMax: number;
  /** Shader backgrounds: pattern / glow size, 0..1. */
  scale: number;
  /** Paper Mesh: distortion and swirl, 0..1 (original defaults 0.8 / 0.1). */
  distortion: number;
  swirl: number;
  /** Mesh gradient color stops (see mesh-presets.ts); Paper Mesh uses the first 6 colors. */
  stops: MeshStop[];
};

/** One drifting blob of the mesh gradient. x/y/radius are fractions of the screen. */
export type MeshStop = { color: string; x: number; y: number; radius: number; driftX: number; driftY: number; speed: number };

export const PARTICLE_COUNT_MAX = 1200;

const DEFAULT_MESH_STOPS: MeshStop[] = [
  { color: '#6d5cff', x: 0.2, y: 0.2, radius: 0.6, driftX: 0.12, driftY: 0.08, speed: 0.6 },
  { color: '#2a1d6b', x: 0.8, y: 0.3, radius: 0.7, driftX: 0.1, driftY: 0.12, speed: 0.4 },
  { color: '#a78bfa', x: 0.5, y: 0.85, radius: 0.55, driftX: 0.14, driftY: 0.06, speed: 0.5 },
  { color: '#0b0a2a', x: 0.1, y: 0.75, radius: 0.6, driftX: 0.08, driftY: 0.1, speed: 0.3 },
];

/** A user preset: background settings plus (optionally) the full appearance: theme, skin, fonts, icons. */
/** Saved presets store absolute values (robust across default changes); `schema` marks the format. */
export const PRESET_SCHEMA = 2;
export type BackgroundPreset = { id: string; name: string; settings: BackgroundSettings; appearance?: AppearanceSettings; schema?: number };

const EXTRAS = { scale: 0.5, distortion: 0.8, swirl: 0.1, position: 0, particleCount: 600, noiseIntensity: 0.003, particleSizeMin: 0.5, particleSizeMax: 2, stops: DEFAULT_MESH_STOPS };

/**
 * REFERENCE = the look of each source/reference, recreated faithfully.
 * DEFAULT  = our variant: REFERENCE + the nudges in BACKGROUND_NUDGES (never identical).
 * The deltas are also documented in docs/theming.md.
 */
export const BACKGROUND_REFERENCES: Record<BackgroundKind, BackgroundSettings> = {
  gradient: { kind: 'gradient', colorA: '#6d5cff', colorB: '#1a1446', colorBack: '#0b0a2a', speed: 1, density: 0.5, intensity: 0.5, blur: 0, opacity: 1, ...EXTRAS },
  video: { kind: 'video', colorA: '#6d5cff', colorB: '#1a1446', colorBack: '#0b0a2a', speed: 1, density: 0.5, intensity: 0.6, blur: 0, opacity: 1, ...EXTRAS },
  // Kokonut UI FloatingPathsBackground (dark mode): white strokes (currentColor) on neutral-950, 36 paths per fan,
  // both fans (position 1 and -1), stroke opacity 0.1 + i*0.03 (intensity 0.5 = x1), 20-30 s cycles (speed 1).
  paths: { kind: 'paths', colorA: '#ffffff', colorB: '#ffffff', colorBack: '#0a0a0a', speed: 1, density: 1, intensity: 0.5, blur: 0, opacity: 1, ...EXTRAS },
  // "liquid Shader" by Freedom (our approximation): blue/violet glowing blobs on deep indigo.
  liquid: { kind: 'liquid', colorA: '#3b82f6', colorB: '#8b5cf6', colorBack: '#0b0a2a', speed: 0.6, density: 0.5, intensity: 0.7, blur: 0, opacity: 1, ...EXTRAS },
  // Ali Imam "Swirl": DitheringShader shape=swirl type=4x4 colorBack #220011 colorFront #00ffff pxSize 4 (density 1/3) speed 0.9.
  swirl: { kind: 'swirl', colorA: '#00ffff', colorB: '#00ffff', colorBack: '#220011', speed: 0.9, density: 1 / 3, intensity: 0.5, blur: 0, opacity: 1, ...EXTRAS },
  // FluidParticlesBackground ("CyberBackground") dark mode: white particles on black, 2000 particles,
  // noiseIntensity 0.003, particleSize 0.5-2, peak alpha 0.15 (intensity 0.2), 2 px/frame (speed 1).
  cyber: { kind: 'cyber', colorA: '#ffffff', colorB: '#ffffff', colorBack: '#000000', speed: 1, density: 0.5, intensity: 0.2, blur: 0, opacity: 1, ...EXTRAS, particleCount: 2000, noiseIntensity: 0.003, particleSizeMin: 0.5, particleSizeMax: 2 },
  // Indigo Aurora mesh (our first mesh look).
  mesh: { kind: 'mesh', colorA: '#6d5cff', colorB: '#a78bfa', colorBack: '#0b0a2a', speed: 0.5, density: 0.5, intensity: 0.5, blur: 60, opacity: 1, ...EXTRAS },
  // Prismatic Lattice brief: 6-fold kaleidoscope of rounded cells, violet/teal iridescence.
  prism: { kind: 'prism', colorA: '#8f82ff', colorB: '#5fe3d2', colorBack: '#07061c', speed: 0.6, density: 0.5, intensity: 0.6, blur: 0, opacity: 1, ...EXTRAS },
  // Aurora Flow brief (after Ruixen UI): teal-green glow on a dark teal field.
  aurora: { kind: 'aurora', colorA: '#14b8a6', colorB: '#a7f3d0', colorBack: '#03201c', speed: 0.6, density: 0.5, intensity: 0.6, blur: 0, opacity: 1, ...EXTRAS },
  // Halftone Clouds brief: lavender dither on deep indigo.
  halftone: { kind: 'halftone', colorA: '#c9c2ff', colorB: '#c9c2ff', colorBack: '#0b0a2a', speed: 0.6, density: 0.4, intensity: 0.5, blur: 0, opacity: 1, ...EXTRAS },
  // Paper Shaders MeshGradient defaults (distortion 0.8, swirl 0.1, speed 1) with the requested
  // indigo / violet / pink / gold blobs on deep navy and grain.
  papermesh: { kind: 'papermesh', colorA: '#6d5cff', colorB: '#a78bfa', colorBack: '#070b24', speed: 1, density: 0.35, intensity: 1, blur: 0, opacity: 1, ...EXTRAS, distortion: 0.8, swirl: 0.1,
    stops: [
      { color: '#3b2fbf', x: 0, y: 0, radius: 0.5, driftX: 0, driftY: 0, speed: 1 },
      { color: '#8b5cf6', x: 0, y: 0, radius: 0.5, driftX: 0, driftY: 0, speed: 1 },
      { color: '#ec4899', x: 0, y: 0, radius: 0.5, driftX: 0, driftY: 0, speed: 1 },
      { color: '#f5b83d', x: 0, y: 0, radius: 0.5, driftX: 0, driftY: 0, speed: 1 },
      { color: '#0b1033', x: 0, y: 0, radius: 0.5, driftX: 0, driftY: 0, speed: 1 },
    ] },
  // Hive brief (after Xor): violet/pink glowing hexagon with rainbow edges on near-black.
  hive: { kind: 'hive', colorA: '#6d5cff', colorB: '#ec4899', colorBack: '#05040f', speed: 0.6, density: 0.5, intensity: 0.6, blur: 0, opacity: 1, ...EXTRAS },
};

export type BackgroundNudge = { hue: number; speed: number; density?: number; intensity?: number; scale?: number; extra?: Partial<BackgroundSettings> };

/** Reference -> default deltas (hue in degrees, speed as multiplier, others additive). */
export const BACKGROUND_NUDGES: Record<BackgroundKind, BackgroundNudge> = {
  // gradient / video are our own (theme gradient, user video), not references: no nudge.
  gradient: { hue: 0, speed: 1 },
  video: { hue: 0, speed: 1 },
  paths: { hue: 248, speed: 1.12, density: -0.14, intensity: 0.05, extra: { colorBack: '#0b0a2a' } }, // white -> faint lavender tint, 31 paths/fan
  liquid: { hue: 15, speed: 1.15, density: 0.1, intensity: -0.05 },
  swirl: { hue: 14, speed: 0.89, density: 0.067, intensity: 0.08 },
  cyber: { hue: 250, speed: 0.9, intensity: 0.3, extra: { particleCount: 600, noiseIntensity: 0.0036, particleSizeMin: 0.6, particleSizeMax: 2.3, colorBack: '#05040f' } },
  mesh: { hue: -14, speed: 1.2, extra: { blur: 66 } },
  prism: { hue: 18, speed: 0.85, intensity: 0.06, scale: 0.08 },
  aurora: { hue: -12, speed: 1.15, intensity: 0.05, scale: -0.06 },
  halftone: { hue: 16, speed: 1.2, density: 0.1, scale: 0.07 },
  papermesh: { hue: 12, speed: 0.85, extra: { distortion: 0.72, swirl: 0.15, density: 0.3 } },
  hive: { hue: 20, speed: 0.9, intensity: 0.07, scale: 0.06 },
};

const c01 = (v: number) => Math.min(1, Math.max(0, v));

export function applyNudge(ref: BackgroundSettings, n: BackgroundNudge): BackgroundSettings {
  const hs = (c: string) => hueShift(c, n.hue);
  return {
    ...ref,
    colorA: hs(ref.colorA), colorB: hs(ref.colorB), colorBack: hs(ref.colorBack),
    speed: Math.round(ref.speed * n.speed * 1000) / 1000,
    density: c01(ref.density + (n.density ?? 0)),
    intensity: c01(ref.intensity + (n.intensity ?? 0)),
    scale: c01(ref.scale + (n.scale ?? 0)),
    stops: ref.stops.map((x, i) => ({ ...x, color: hs(x.color), x: x.x + (i % 2 ? 0.04 : -0.04), speed: x.speed * n.speed })),
    ...n.extra,
  };
}

export const BACKGROUND_DEFAULTS: Record<BackgroundKind, BackgroundSettings> = Object.fromEntries(
  BACKGROUND_KINDS.map((k) => [k, applyNudge(BACKGROUND_REFERENCES[k], BACKGROUND_NUDGES[k])]),
) as Record<BackgroundKind, BackgroundSettings>;

const clamp = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const isColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

export function normalizeStops(input: unknown, fallback: MeshStop[]): MeshStop[] {
  if (!Array.isArray(input)) return fallback.map((x) => ({ ...x }));
  const stops = input.slice(0, 8).filter((x) => x && isColor(x.color)).map((x) => ({
    color: x.color as string,
    x: clamp(x.x, -0.5, 1.5, 0.5), y: clamp(x.y, -0.5, 1.5, 0.5), radius: clamp(x.radius, 0.05, 2, 0.5),
    driftX: clamp(x.driftX, 0, 1, 0.1), driftY: clamp(x.driftY, 0, 1, 0.1), speed: clamp(x.speed, 0, 3, 0.5),
  }));
  return stops.length >= 2 ? stops : fallback.map((x) => ({ ...x }));
}

export function normalizeSettings(input: unknown): BackgroundSettings {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<BackgroundSettings>;
  const kind = BACKGROUND_KINDS.includes(raw.kind as BackgroundKind) ? (raw.kind as BackgroundKind) : 'gradient';
  const d = BACKGROUND_DEFAULTS[kind];
  return {
    kind,
    colorA: isColor(raw.colorA) ? raw.colorA : d.colorA,
    colorB: isColor(raw.colorB) ? raw.colorB : d.colorB,
    colorBack: isColor(raw.colorBack) ? raw.colorBack : d.colorBack,
    speed: clamp(raw.speed, 0, 2, d.speed),
    density: clamp(raw.density, 0, 1, d.density),
    intensity: clamp(raw.intensity, 0, 1, d.intensity),
    blur: clamp(raw.blur, 0, kind === 'mesh' ? 120 : 20, d.blur),
    opacity: clamp(raw.opacity, 0, 1, d.opacity),
    scale: clamp(raw.scale, 0, 1, d.scale),
    distortion: clamp(raw.distortion, 0, 1, d.distortion),
    swirl: clamp(raw.swirl, 0, 1, d.swirl),
    position: raw.position === 1 || raw.position === -1 ? raw.position : 0,
    particleCount: Math.round(clamp(raw.particleCount, 50, PARTICLE_COUNT_MAX, d.particleCount)),
    noiseIntensity: clamp(raw.noiseIntensity, 0.0005, 0.02, d.noiseIntensity),
    particleSizeMin: clamp(raw.particleSizeMin, 0.2, 6, d.particleSizeMin),
    particleSizeMax: Math.max(clamp(raw.particleSizeMin, 0.2, 6, d.particleSizeMin), clamp(raw.particleSizeMax, 0.2, 8, d.particleSizeMax)),
    stops: normalizeStops(raw.stops, d.stops),
  };
}

export function normalizePresets(input: unknown): BackgroundPreset[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((p): p is BackgroundPreset => Boolean(p) && typeof p.id === 'string' && typeof p.name === 'string')
    .map((p) => ({ id: p.id, name: p.name.trim().slice(0, 60) || 'Preset', settings: normalizeSettings(p.settings), schema: PRESET_SCHEMA, ...(p.appearance ? { appearance: normalizeAppearance(p.appearance) } : {}) }));
}

export function savePreset(presets: BackgroundPreset[], name: string, settings: BackgroundSettings, id = `p${Date.now().toString(36)}`, appearance?: AppearanceSettings): BackgroundPreset[] {
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) return presets;
  const existing = presets.find((p) => p.name === trimmed);
  const extra = appearance ? { appearance: normalizeAppearance(appearance) } : {};
  if (existing) return presets.map((p) => (p.id === existing.id ? { ...p, settings: normalizeSettings(settings), schema: PRESET_SCHEMA, ...extra } : p));
  return [...presets, { id, name: trimmed, settings: normalizeSettings(settings), schema: PRESET_SCHEMA, ...extra }];
}

export function renamePreset(presets: BackgroundPreset[], id: string, name: string): BackgroundPreset[] {
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed || presets.some((p) => p.id !== id && p.name === trimmed)) return presets;
  return presets.map((p) => (p.id === id ? { ...p, name: trimmed } : p));
}

export function deletePreset(presets: BackgroundPreset[], id: string): BackgroundPreset[] {
  return presets.filter((p) => p.id !== id);
}

export const BACKGROUND_STORAGE_KEYS = { active: 'ui.background.active.v1', presets: 'ui.background.presets.v1', appearance: 'ui.appearance.v1' } as const;
