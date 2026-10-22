/** Pure model for animated background settings and named presets (no React/RN imports). */
import { normalizeAppearance, type AppearanceSettings } from './appearance';
import { hexToHsl, hslToHex, hueShift } from './color-math';

export const BACKGROUND_KINDS = [
  'gradient', 'video', 'paths', 'liquid', 'swirl', 'cyber', 'mesh', 'prism', 'aurora', 'gradient3', 'bounce', 'orbit', 'repel',
  'halftone', 'papermesh', 'hive', 'waves', 'starfield', 'plasma',
] as const;
export type BackgroundKind = (typeof BACKGROUND_KINDS)[number];

export type BackgroundSettings = {
  kind: BackgroundKind;
  /** Primary color. For layered styles this mirrors layerColors[0]. */
  colorA: string;
  /** Secondary color. For layered styles this mirrors layerColors[1] (or [0]). */
  colorB: string;
  /** Background / base color. */
  colorBack: string;
  /** One color per light ball / particle layer / band (see LAYER_COUNTS in params.ts). */
  layerColors: string[];
  /** Animation speed multiplier, 0..2. */
  speed: number;
  /** Particle density: line count, dot size, ball or star count depending on kind; 0..1. */
  density: number;
  /** Glow / contrast; 0..1. */
  intensity: number;
  /** Blur in px applied to the layer, 0..20 (mesh 0..120). */
  blur: number;
  /** Layer opacity, 0..1. */
  opacity: number;
  /** Randomness / turbulence of motion, 0..1. 0 = the calm original motion. */
  chaos: number;
  /** Edge / impact glow: edges and colliding particles shimmer with impact strength, 0..1. */
  glow: number;
  /** -1..1. Positive inverts brightness; negative flips hues around grey (keeps brightness). */
  invert: number;
  /** Floating paths: 1 or -1 draws one fan (the original `position` prop); 0 draws both mirrored fans. */
  position: number;
  /** Cyber particles: particle count (original default 2000; capped for mobile). */
  particleCount: number;
  /** Cyber particles: Perlin noise frequency (original `noiseIntensity`, default 0.003). */
  noiseIntensity: number;
  /** Cyber particles: radius range in px (original `particleSize` {min,max}). */
  particleSizeMin: number;
  particleSizeMax: number;
  /** Pattern / glow / ball size, 0..1. */
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
export const MAX_LAYERS = 6;

/**
 * Colors per layer for each kind (0 = the kind uses colorA/colorB/colorBack or mesh stops instead).
 * Kept here (not params.ts) because normalization needs it.
 */
export const LAYER_COUNTS: Record<BackgroundKind, number> = {
  gradient: 0, video: 0, mesh: 0, papermesh: 0,
  paths: 2, liquid: 6, swirl: 3, cyber: 4, prism: 2, aurora: 2, gradient3: 3, bounce: 6, orbit: 6, repel: 6,
  halftone: 2, hive: 5, waves: 3, starfield: 3, plasma: 3,
};

const DEFAULT_MESH_STOPS: MeshStop[] = [
  { color: '#6d5cff', x: 0.2, y: 0.2, radius: 0.6, driftX: 0.12, driftY: 0.08, speed: 0.6 },
  { color: '#2a1d6b', x: 0.8, y: 0.3, radius: 0.7, driftX: 0.1, driftY: 0.12, speed: 0.4 },
  { color: '#a78bfa', x: 0.5, y: 0.85, radius: 0.55, driftX: 0.14, driftY: 0.06, speed: 0.5 },
  { color: '#0b0a2a', x: 0.1, y: 0.75, radius: 0.6, driftX: 0.08, driftY: 0.1, speed: 0.3 },
];

/** A user preset: background settings plus (optionally) the full appearance: theme, skin, fonts, icons, text. */
/**
 * Saved presets store absolute values (robust across default changes); `schema` marks the format.
 * 2 = absolute values; 3 = adds chaos / glow / invert / layerColors (older presets migrate to neutral 0s).
 */
export const PRESET_SCHEMA = 3;
export type BackgroundPreset = { id: string; name: string; settings: BackgroundSettings; appearance?: AppearanceSettings; schema?: number };

const lerpHex = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16); const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
};

/** Default per-layer colors from a primary/secondary pair: a spread between them with small hue steps. */
export function deriveLayerColors(kind: BackgroundKind, a: string, b: string): string[] {
  const n = LAYER_COUNTS[kind];
  if (n === 0) return [];
  if (n === 1) return [a];
  return Array.from({ length: n }, (_, i) => {
    if (i === 0) return a;
    if (i === 1) return b;
    const mixed = lerpHex(a, b, (i % 2) * 0.5 + 0.25);
    const [h, s, l] = hexToHsl(mixed);
    return hslToHex(((h + (i - 1) * 37) % 360 + 360) % 360, Math.max(s, 0.35), Math.min(0.8, Math.max(0.35, l)));
  });
}

const EXTRAS = { scale: 0.5, distortion: 0.8, swirl: 0.1, position: 0, particleCount: 600, noiseIntensity: 0.003, particleSizeMin: 0.5, particleSizeMax: 2, stops: DEFAULT_MESH_STOPS, chaos: 0.25, glow: 0.3, invert: 0 };

type RefInput = Omit<BackgroundSettings, 'layerColors' | keyof typeof EXTRAS> & Partial<BackgroundSettings>;
const ref = (s: RefInput): BackgroundSettings => {
  const full = { ...EXTRAS, ...s } as BackgroundSettings;
  const layerColors = s.layerColors ?? deriveLayerColors(s.kind, s.colorA, s.colorB);
  return { ...full, layerColors, ...mirror(layerColors, full) };
};
const mirror = (layers: string[], s: Pick<BackgroundSettings, 'colorA' | 'colorB'>) =>
  layers.length ? { colorA: layers[0], colorB: layers[1] ?? layers[0] } : { colorA: s.colorA, colorB: s.colorB };

/**
 * REFERENCE = the look of each source/reference, recreated faithfully (opacity 1, no blur).
 * DEFAULT  = our variant: REFERENCE + the nudges in BACKGROUND_NUDGES (never identical).
 * The deltas are also documented in docs/theming.md.
 */
export const BACKGROUND_REFERENCES: Record<BackgroundKind, BackgroundSettings> = {
  gradient: ref({ kind: 'gradient', colorA: '#6d5cff', colorB: '#1a1446', colorBack: '#0b0a2a', speed: 1, density: 0.5, intensity: 0.5, blur: 0, opacity: 1 }),
  video: ref({ kind: 'video', colorA: '#6d5cff', colorB: '#1a1446', colorBack: '#0b0a2a', speed: 1, density: 0.5, intensity: 0.6, blur: 0, opacity: 1 }),
  // Kokonut UI FloatingPathsBackground (dark mode): white strokes (currentColor) on neutral-950, 36 paths per fan,
  // both fans (position 1 and -1), stroke opacity 0.1 + i*0.03 (intensity 0.5 = x1), 20-30 s cycles (speed 1).
  paths: ref({ kind: 'paths', colorA: '#ffffff', colorB: '#ffffff', colorBack: '#0a0a0a', speed: 1, density: 1, intensity: 0.5, blur: 0, opacity: 1 }),
  // "liquid Shader" by Freedom (our approximation): blue/violet glowing blobs on deep indigo.
  liquid: ref({ kind: 'liquid', colorA: '#3b82f6', colorB: '#8b5cf6', colorBack: '#0b0a2a', speed: 0.6, density: 0.5, intensity: 0.7, blur: 0, opacity: 1 }),
  // Ali Imam "Swirl": DitheringShader shape=swirl type=4x4 colorBack #220011 colorFront #00ffff pxSize 4 (density 1/3) speed 0.9.
  swirl: ref({ kind: 'swirl', colorA: '#00ffff', colorB: '#00ffff', colorBack: '#220011', speed: 0.9, density: 1 / 3, intensity: 0.5, blur: 0, opacity: 1, layerColors: ['#00ffff', '#00ffff', '#00ffff'] }),
  // FluidParticlesBackground ("CyberBackground") dark mode: white particles on black, 2000 particles,
  // noiseIntensity 0.003, particleSize 0.5-2, peak alpha 0.15 (intensity 0.2), 2 px/frame (speed 1).
  cyber: ref({ kind: 'cyber', colorA: '#ffffff', colorB: '#ffffff', colorBack: '#000000', speed: 1, density: 0.5, intensity: 0.2, blur: 0, opacity: 1, particleCount: 2000, noiseIntensity: 0.003, particleSizeMin: 0.5, particleSizeMax: 2, layerColors: ['#ffffff', '#ffffff', '#ffffff', '#ffffff'] }),
  // Indigo Aurora mesh (our first mesh look).
  mesh: ref({ kind: 'mesh', colorA: '#6d5cff', colorB: '#a78bfa', colorBack: '#0b0a2a', speed: 0.5, density: 0.5, intensity: 0.5, blur: 60, opacity: 1 }),
  // Prismatic Lattice brief: 6-fold kaleidoscope of rounded cells, violet/teal iridescence.
  prism: ref({ kind: 'prism', colorA: '#8f82ff', colorB: '#5fe3d2', colorBack: '#07061c', speed: 0.6, density: 0.5, intensity: 0.6, blur: 0, opacity: 1 }),
  // Aurora Flow brief (after Ruixen UI): teal and mint light balls on a dark teal field.
  aurora: ref({ kind: 'aurora', colorA: '#14b8a6', colorB: '#a7f3d0', colorBack: '#03201c', speed: 0.6, density: 0.5, intensity: 0.6, blur: 0, opacity: 1 }),
  // Our own 3-ball gradient: violet, pink and amber orbs blended smoothly.
  gradient3: ref({ kind: 'gradient3', colorA: '#7c6bff', colorB: '#ec4899', colorBack: '#0b0a2a', speed: 0.5, density: 0.5, intensity: 0.6, blur: 0, opacity: 1, layerColors: ['#7c6bff', '#ec4899', '#f5b83d'] }),
  // Our own ball physics styles.
  bounce: ref({ kind: 'bounce', colorA: '#38bdf8', colorB: '#f472b6', colorBack: '#060814', speed: 1, density: 0.5, intensity: 0.6, blur: 0, opacity: 1, glow: 0.5 }),
  orbit: ref({ kind: 'orbit', colorA: '#a78bfa', colorB: '#fbbf24', colorBack: '#07051a', speed: 1, density: 0.5, intensity: 0.6, blur: 0, opacity: 1, glow: 0.45 }),
  repel: ref({ kind: 'repel', colorA: '#22d3ee', colorB: '#f43f5e', colorBack: '#05070f', speed: 1, density: 0.5, intensity: 0.6, blur: 0, opacity: 1, glow: 0.55 }),
  // Halftone Clouds brief: lavender dither on deep indigo.
  halftone: ref({ kind: 'halftone', colorA: '#c9c2ff', colorB: '#c9c2ff', colorBack: '#0b0a2a', speed: 0.6, density: 0.4, intensity: 0.5, blur: 0, opacity: 1, layerColors: ['#c9c2ff', '#c9c2ff'] }),
  // Paper Shaders MeshGradient defaults (distortion 0.8, swirl 0.1, speed 1) with the requested
  // indigo / violet / pink / gold blobs on deep navy and grain.
  papermesh: ref({ kind: 'papermesh', colorA: '#6d5cff', colorB: '#a78bfa', colorBack: '#070b24', speed: 1, density: 0.35, intensity: 1, blur: 0, opacity: 1, distortion: 0.8, swirl: 0.1,
    stops: [
      { color: '#3b2fbf', x: 0, y: 0, radius: 0.5, driftX: 0, driftY: 0, speed: 1 },
      { color: '#8b5cf6', x: 0, y: 0, radius: 0.5, driftX: 0, driftY: 0, speed: 1 },
      { color: '#ec4899', x: 0, y: 0, radius: 0.5, driftX: 0, driftY: 0, speed: 1 },
      { color: '#f5b83d', x: 0, y: 0, radius: 0.5, driftX: 0, driftY: 0, speed: 1 },
      { color: '#0b1033', x: 0, y: 0, radius: 0.5, driftX: 0, driftY: 0, speed: 1 },
    ] }),
  // Hive brief (after Xor): violet/pink glowing hexagon with red/green/blue (rainbow) edge bands on near-black.
  hive: ref({ kind: 'hive', colorA: '#6d5cff', colorB: '#ec4899', colorBack: '#05040f', speed: 0.6, density: 0.5, intensity: 0.6, blur: 0, opacity: 1, layerColors: ['#6d5cff', '#ec4899', '#ff3359', '#40ff73', '#4d73ff'] }),
  // Our own: layered glowing sine ribbons.
  waves: ref({ kind: 'waves', colorA: '#60a5fa', colorB: '#c084fc', colorBack: '#050816', speed: 0.8, density: 0.5, intensity: 0.6, blur: 0, opacity: 1, layerColors: ['#60a5fa', '#c084fc', '#2dd4bf'] }),
  // Our own: warp-speed star field in three depth layers.
  starfield: ref({ kind: 'starfield', colorA: '#ffffff', colorB: '#a5b4fc', colorBack: '#02030a', speed: 0.8, density: 0.5, intensity: 0.6, blur: 0, opacity: 1, layerColors: ['#ffffff', '#a5b4fc', '#f0abfc'] }),
  // Our own: classic sine plasma with a three-color palette.
  plasma: ref({ kind: 'plasma', colorA: '#7c3aed', colorB: '#06b6d4', colorBack: '#0a0618', speed: 0.6, density: 0.5, intensity: 0.6, blur: 0, opacity: 1, layerColors: ['#7c3aed', '#06b6d4', '#f472b6'] }),
};

export type BackgroundNudge = { hue: number; speed: number; density?: number; intensity?: number; scale?: number; chaos?: number; glow?: number; extra?: Partial<BackgroundSettings> };

/**
 * Applied to every default after the nudge: opacity and blur sit strictly inside their slider range so
 * both directions do something (a default at the range edge made the slider one-directional).
 */
export const DEFAULT_LAYER = { opacity: 0.9, blur: 1.5 } as const;
/** Pixel/dither styles keep a lighter default blur so the dither stays readable. */
const CRISP_BLUR = 0.6;

/** Reference -> default deltas (hue in degrees, speed as multiplier, others additive). */
export const BACKGROUND_NUDGES: Record<BackgroundKind, BackgroundNudge> = {
  // gradient / video are our own (theme gradient, user video), not references: no nudge.
  gradient: { hue: 0, speed: 1 },
  video: { hue: 0, speed: 1 },
  paths: { hue: 248, speed: 1.12, density: -0.14, intensity: 0.05, extra: { colorBack: '#0b0a2a' } }, // white -> faint lavender tint, 31 paths/fan
  liquid: { hue: 15, speed: 1.15, density: 0.1, intensity: -0.05 },
  swirl: { hue: 14, speed: 0.89, density: 0.067, intensity: 0.08, extra: { blur: CRISP_BLUR } },
  cyber: { hue: 250, speed: 0.9, intensity: 0.3, extra: { particleCount: 600, noiseIntensity: 0.0036, particleSizeMin: 0.6, particleSizeMax: 2.3, colorBack: '#05040f' } },
  mesh: { hue: -14, speed: 1.2, extra: { blur: 66 } },
  prism: { hue: 18, speed: 0.85, intensity: 0.06, scale: 0.08 },
  aurora: { hue: -12, speed: 1.15, intensity: 0.05, scale: -0.06, glow: 0.05 },
  gradient3: { hue: 10, speed: 0.9, intensity: 0.04, scale: 0.05 },
  bounce: { hue: 12, speed: 0.9, chaos: 0.05, glow: 0.05 },
  orbit: { hue: -12, speed: 1.1, scale: 0.05, chaos: -0.05 },
  repel: { hue: 14, speed: 0.92, intensity: 0.05, glow: -0.05 },
  halftone: { hue: 16, speed: 1.2, density: 0.1, scale: 0.07, extra: { blur: CRISP_BLUR } },
  papermesh: { hue: 12, speed: 0.85, intensity: -0.1, extra: { distortion: 0.72, swirl: 0.15, density: 0.3 } },
  hive: { hue: 20, speed: 0.9, intensity: 0.07, scale: 0.06 },
  waves: { hue: 12, speed: 1.1, density: 0.05, glow: 0.05 },
  starfield: { hue: 15, speed: 0.9, density: 0.05, scale: 0.04 },
  plasma: { hue: -14, speed: 1.1, intensity: 0.05, chaos: 0.05 },
};

const c01 = (v: number) => Math.min(1, Math.max(0, v));

export function applyNudge(r: BackgroundSettings, n: BackgroundNudge): BackgroundSettings {
  const hs = (c: string) => hueShift(c, n.hue);
  const layerColors = r.layerColors.map(hs);
  const next: BackgroundSettings = {
    ...r,
    colorA: hs(r.colorA), colorB: hs(r.colorB), colorBack: hs(r.colorBack), layerColors,
    speed: Math.round(r.speed * n.speed * 1000) / 1000,
    density: c01(r.density + (n.density ?? 0)),
    intensity: c01(r.intensity + (n.intensity ?? 0)),
    scale: c01(r.scale + (n.scale ?? 0)),
    chaos: c01(r.chaos + (n.chaos ?? 0)),
    glow: c01(r.glow + (n.glow ?? 0)),
    stops: r.stops.map((x, i) => ({ ...x, color: hs(x.color), x: x.x + (i % 2 ? 0.04 : -0.04), speed: x.speed * n.speed })),
    ...DEFAULT_LAYER,
    ...n.extra,
  };
  return { ...next, ...mirror(next.layerColors, next) };
}

export const BACKGROUND_DEFAULTS: Record<BackgroundKind, BackgroundSettings> = Object.fromEntries(
  BACKGROUND_KINDS.map((k) => [k, applyNudge(BACKGROUND_REFERENCES[k], BACKGROUND_NUDGES[k])]),
) as Record<BackgroundKind, BackgroundSettings>;

/** Values that reproduce the pre-schema-3 rendering (no chaos, glow or invert existed then). */
export const LEGACY_NEUTRAL = { chaos: 0, glow: 0, invert: 0 } as const;

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

function normalizeLayers(input: unknown, kind: BackgroundKind, a: string, b: string): string[] {
  const n = LAYER_COUNTS[kind];
  const derived = deriveLayerColors(kind, a, b);
  const list = Array.isArray(input) ? input.filter(isColor) : [];
  return Array.from({ length: n }, (_, i) => list[i] ?? derived[i]);
}

/** A settings object written before chaos/glow/invert existed (schema < 3 or legacy active settings). */
export function isLegacySettings(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Record<string, unknown>;
  return r.chaos === undefined && r.glow === undefined && r.invert === undefined && r.layerColors === undefined && r.kind !== undefined;
}

export function normalizeSettings(input: unknown): BackgroundSettings {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<BackgroundSettings>;
  const kind = BACKGROUND_KINDS.includes(raw.kind as BackgroundKind) ? (raw.kind as BackgroundKind) : 'gradient';
  const d = BACKGROUND_DEFAULTS[kind];
  const legacy = isLegacySettings(raw);
  const colorA = isColor(raw.colorA) ? raw.colorA : d.colorA;
  const colorB = isColor(raw.colorB) ? raw.colorB : d.colorB;
  // Legacy settings had no per-layer colors: derive them from that preset's own primary/secondary,
  // except hive, whose bands were fixed red/green/blue then.
  const layerSource = raw.layerColors ?? (legacy ? (kind === 'hive' ? [colorA, colorB, ...BACKGROUND_REFERENCES.hive.layerColors.slice(2)] : deriveLayerColors(kind, colorA, colorB)) : d.layerColors);
  const layerColors = normalizeLayers(layerSource, kind, colorA, colorB);
  const particleSizeMin = clamp(raw.particleSizeMin, 0.2, 6, d.particleSizeMin);
  const neutral = legacy ? LEGACY_NEUTRAL : d;
  const base = {
    kind,
    colorA, colorB,
    colorBack: isColor(raw.colorBack) ? raw.colorBack : d.colorBack,
    layerColors,
    speed: clamp(raw.speed, 0, 2, d.speed),
    density: clamp(raw.density, 0, 1, d.density),
    intensity: clamp(raw.intensity, 0, 1, d.intensity),
    blur: clamp(raw.blur, 0, kind === 'mesh' ? 120 : 20, d.blur),
    opacity: clamp(raw.opacity, 0, 1, d.opacity),
    chaos: clamp(raw.chaos, 0, 1, neutral.chaos),
    glow: clamp(raw.glow, 0, 1, neutral.glow),
    invert: clamp(raw.invert, -1, 1, neutral.invert),
    scale: clamp(raw.scale, 0, 1, d.scale),
    distortion: clamp(raw.distortion, 0, 1, d.distortion),
    swirl: clamp(raw.swirl, 0, 1, d.swirl),
    position: raw.position === 1 || raw.position === -1 ? raw.position : 0,
    particleCount: Math.round(clamp(raw.particleCount, 50, PARTICLE_COUNT_MAX, d.particleCount)),
    noiseIntensity: clamp(raw.noiseIntensity, 0.0005, 0.02, d.noiseIntensity),
    particleSizeMin,
    particleSizeMax: Math.max(particleSizeMin, clamp(raw.particleSizeMax, 0.2, 8, d.particleSizeMax)),
    stops: normalizeStops(raw.stops, d.stops),
  };
  return { ...base, ...mirror(layerColors, base) };
}

/**
 * Applies a patch. A patch that sets colorA/colorB (theme suggestions) without layerColors re-derives
 * the layers from the new pair; a patch that sets layerColors updates the colorA/colorB mirrors.
 */
export function patchSettings(current: BackgroundSettings, patch: Partial<BackgroundSettings>): BackgroundSettings {
  const next = { ...current, ...patch };
  if (!patch.layerColors && (patch.colorA || patch.colorB) && LAYER_COUNTS[next.kind] > 0) {
    next.layerColors = deriveLayerColors(next.kind, next.colorA, next.colorB);
  }
  return normalizeSettings(next);
}

/**
 * Migrates one stored preset to the current schema (see PRESET_SCHEMA). Presets older than schema 3 get
 * neutral chaos/glow/invert (their original look) and per-layer colors derived from their own colors.
 */
export function migratePreset(p: BackgroundPreset): BackgroundPreset {
  const raw = (p.settings && typeof p.settings === 'object' ? p.settings : {}) as Partial<BackgroundSettings>;
  const old = (p.schema ?? 1) < 3;
  const settings = normalizeSettings(old ? { ...raw, kind: raw.kind ?? 'gradient' } : raw);
  return { ...p, settings, schema: PRESET_SCHEMA };
}

export function normalizePresets(input: unknown): BackgroundPreset[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((p): p is BackgroundPreset => Boolean(p) && typeof p.id === 'string' && typeof p.name === 'string')
    .map((p) => {
      const m = migratePreset(p);
      return { id: p.id, name: p.name.trim().slice(0, 60) || 'Preset', settings: m.settings, schema: PRESET_SCHEMA, ...(p.appearance ? { appearance: normalizeAppearance(p.appearance) } : {}) };
    });
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
