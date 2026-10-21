/** Built-in, code-only background presets (loadable like user presets; not editable). */
import { MESH_PRESETS } from './mesh-presets';
import { BACKGROUND_DEFAULTS, normalizeSettings, type BackgroundKind, type BackgroundSettings } from './settings';

export type BuiltinPreset = { id: string; name: string; settings: BackgroundSettings };

const mk = (id: string, name: string, kind: BackgroundKind, patch: Partial<BackgroundSettings> = {}): BuiltinPreset =>
  ({ id, name, settings: normalizeSettings({ ...BACKGROUND_DEFAULTS[kind], ...patch }) });

const soft = MESH_PRESETS.find((m) => m.id === 'softMesh')!;

export const BUILTIN_PRESETS: BuiltinPreset[] = [
  mk('prismaticLattice', 'Prismatic Lattice', 'prism'),
  mk('auroraFlow', 'Aurora Flow', 'aurora'),
  mk('auroraDeepBlue', 'Aurora Flow (Deep Blue)', 'aurora', { colorA: '#2563eb', colorB: '#93c5fd', colorBack: '#020617' }),
  mk('halftoneClouds', 'Halftone Clouds', 'halftone'),
  mk('paperMesh', 'Paper Mesh', 'papermesh'),
  mk('hive', 'Hive', 'hive'),
  mk('softMesh', 'Soft Mesh', 'mesh', { stops: soft.stops, colorBack: soft.colorBack, blur: soft.blur, speed: 0.4 }),
];

/** A small static thumbnail for each preset: 2-4 representative colors (drawn as a gradient chip). */
export function presetThumbnail(p: BuiltinPreset): string[] {
  const s = p.settings;
  if (s.kind === 'mesh' || s.kind === 'papermesh') return [s.colorBack, ...s.stops.slice(0, 3).map((x) => x.color)];
  return [s.colorBack, s.colorA, s.colorB];
}
