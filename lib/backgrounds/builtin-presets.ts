/**
 * Built-in, code-only background presets (loadable like user presets; not editable).
 * A preset sets the style, every color and every slider together (normalizeSettings fills the
 * full unified parameter set), so loading one always gives exactly the same look.
 */
import { MESH_PRESETS } from './mesh-presets';
import { hueShift } from './color-math';
import { BACKGROUND_DEFAULTS, normalizeSettings, type BackgroundKind, type BackgroundSettings } from './settings';

export type BuiltinPreset = { id: string; name: string; settings: BackgroundSettings };

const mk = (id: string, name: string, kind: BackgroundKind, patch: Partial<BackgroundSettings> = {}): BuiltinPreset =>
  ({ id, name, settings: normalizeSettings({ ...BACKGROUND_DEFAULTS[kind], ...patch }) });

// Soft Mesh uses the nudged mesh preset (reference: teal #14b8a6 -> blue #3b82f6 -> purple #8b5cf6).
const soft = MESH_PRESETS.find((m) => m.id === 'softMesh')!;
const deep = (c: string) => hueShift(c, -14);

export const BUILTIN_PRESETS: BuiltinPreset[] = [
  mk('prismaticLattice', 'Prismatic Lattice', 'prism'),
  mk('auroraFlow', 'Aurora Flow', 'aurora'),
  // Deep-blue variant: reference #2563eb / #93c5fd / #020617 (default hue -14 deg), and a calmer,
  // larger, slower pair of balls with more glow so it differs in motion too, not only in color.
  mk('auroraDeepBlue', 'Aurora Flow (Deep Blue)', 'aurora', {
    colorBack: deep('#020617'), layerColors: [deep('#2563eb'), deep('#93c5fd')],
    speed: 0.45, scale: 0.75, chaos: 0.1, glow: 0.6, intensity: 0.75, blur: 4,
  }),
  mk('triOrb', 'Tri-orb Gradient', 'gradient3'),
  mk('billiards', 'Neon Billiards', 'bounce'),
  mk('gravityWell', 'Gravity Well', 'orbit'),
  mk('shockwave', 'Shockwave', 'repel'),
  mk('halftoneClouds', 'Halftone Clouds', 'halftone'),
  mk('paperMesh', 'Paper Mesh', 'papermesh'),
  mk('hive', 'Hive', 'hive'),
  mk('silkWaves', 'Silk Waves', 'waves'),
  mk('warpStars', 'Warp Stars', 'starfield'),
  mk('plasmaPop', 'Plasma Pop', 'plasma'),
  mk('softMesh', 'Soft Mesh', 'mesh', { stops: soft.stops, colorBack: soft.colorBack, blur: soft.blur, speed: 0.4 }),
];

/** A small static thumbnail for each preset: 2-4 representative colors (drawn as a gradient chip). */
export function presetThumbnail(p: BuiltinPreset): string[] {
  const s = p.settings;
  if (s.kind === 'mesh' || s.kind === 'papermesh') return [s.colorBack, ...s.stops.slice(0, 3).map((x) => x.color)];
  if (s.layerColors.length) return [s.colorBack, ...s.layerColors.slice(0, 3)];
  return [s.colorBack, s.colorA, s.colorB];
}
