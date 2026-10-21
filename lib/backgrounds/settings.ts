/** Pure model for animated background settings and named presets (no React/RN imports). */
import { normalizeAppearance, type AppearanceSettings } from './appearance';

export const BACKGROUND_KINDS = ['gradient', 'video', 'paths', 'liquid', 'swirl'] as const;
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
};

/** A user preset: background settings plus (optionally) the full appearance: theme, skin, fonts, icons. */
export type BackgroundPreset = { id: string; name: string; settings: BackgroundSettings; appearance?: AppearanceSettings };

export const BACKGROUND_DEFAULTS: Record<BackgroundKind, BackgroundSettings> = {
  gradient: { kind: 'gradient', colorA: '#6d5cff', colorB: '#1a1446', colorBack: '#0b0a2a', speed: 1, density: 0.5, intensity: 0.5, blur: 0, opacity: 1 },
  video: { kind: 'video', colorA: '#6d5cff', colorB: '#1a1446', colorBack: '#0b0a2a', speed: 1, density: 0.5, intensity: 0.6, blur: 0, opacity: 1 },
  // Kokonut UI "Background Paths": thin flowing curves, white-ish strokes.
  paths: { kind: 'paths', colorA: '#c9c2ff', colorB: '#6d5cff', colorBack: '#0b0a2a', speed: 1, density: 0.6, intensity: 0.5, blur: 0, opacity: 1 },
  // "liquid Shader": soft blue/violet glowing blobs.
  liquid: { kind: 'liquid', colorA: '#3b82f6', colorB: '#8b5cf6', colorBack: '#0b0a2a', speed: 0.6, density: 0.5, intensity: 0.7, blur: 0, opacity: 1 },
  // Ali Imam "Swirl": 4x4 Bayer-dithered swirl, cyan on dark plum, pxSize 4, speed 0.9.
  swirl: { kind: 'swirl', colorA: '#00ffff', colorB: '#00ffff', colorBack: '#220011', speed: 0.9, density: 0.4, intensity: 0.5, blur: 0, opacity: 1 },
};

const clamp = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const isColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

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
    blur: clamp(raw.blur, 0, 20, d.blur),
    opacity: clamp(raw.opacity, 0, 1, d.opacity),
  };
}

export function normalizePresets(input: unknown): BackgroundPreset[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((p): p is BackgroundPreset => Boolean(p) && typeof p.id === 'string' && typeof p.name === 'string')
    .map((p) => ({ id: p.id, name: p.name.trim().slice(0, 60) || 'Preset', settings: normalizeSettings(p.settings), ...(p.appearance ? { appearance: normalizeAppearance(p.appearance) } : {}) }));
}

export function savePreset(presets: BackgroundPreset[], name: string, settings: BackgroundSettings, id = `p${Date.now().toString(36)}`, appearance?: AppearanceSettings): BackgroundPreset[] {
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) return presets;
  const existing = presets.find((p) => p.name === trimmed);
  const extra = appearance ? { appearance: normalizeAppearance(appearance) } : {};
  if (existing) return presets.map((p) => (p.id === existing.id ? { ...p, settings: normalizeSettings(settings), ...extra } : p));
  return [...presets, { id, name: trimmed, settings: normalizeSettings(settings), ...extra }];
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
