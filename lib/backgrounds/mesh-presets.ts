/**
 * Mesh-gradient presets as plain data. Add new ones (e.g. sampled from gradient
 * screenshots) by appending an entry: 2-8 stops, positions/radii as fractions of
 * the screen, drift as fraction of the screen, speed as a multiplier.
 */
import type { MeshStop } from './settings';

export type MeshPreset = { id: string; name: string; colorBack: string; blur: number; stops: MeshStop[] };

export const MESH_PRESETS: MeshPreset[] = [
  {
    id: 'indigoAurora', name: 'Indigo Aurora', colorBack: '#0b0a2a', blur: 60,
    stops: [
      { color: '#6d5cff', x: 0.2, y: 0.2, radius: 0.6, driftX: 0.12, driftY: 0.08, speed: 0.6 },
      { color: '#2a1d6b', x: 0.8, y: 0.3, radius: 0.7, driftX: 0.1, driftY: 0.12, speed: 0.4 },
      { color: '#a78bfa', x: 0.5, y: 0.85, radius: 0.55, driftX: 0.14, driftY: 0.06, speed: 0.5 },
      { color: '#0b0a2a', x: 0.1, y: 0.75, radius: 0.6, driftX: 0.08, driftY: 0.1, speed: 0.3 },
    ],
  },
  {
    id: 'deepOcean', name: 'Deep Ocean', colorBack: '#040d20', blur: 70,
    stops: [
      { color: '#1f5fd1', x: 0.25, y: 0.3, radius: 0.65, driftX: 0.1, driftY: 0.1, speed: 0.5 },
      { color: '#0e7c74', x: 0.75, y: 0.65, radius: 0.6, driftX: 0.12, driftY: 0.08, speed: 0.4 },
      { color: '#3b2a8f', x: 0.6, y: 0.15, radius: 0.5, driftX: 0.08, driftY: 0.12, speed: 0.6 },
    ],
  },
];
