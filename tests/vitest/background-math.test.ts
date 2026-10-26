import { describe, expect, it } from 'vitest';

import { kokonutPath, P512, perlin3, stepParticles } from '../../lib/backgrounds/background-math';
import { BACKGROUND_REFERENCES, normalizeSettings, PARTICLE_COUNT_MAX } from '../../lib/backgrounds/settings';
import { MESH_PRESETS } from '../../lib/backgrounds/mesh-presets';

describe('ported background math', () => {
  it('matches the Kokonut FloatingPaths path formula', () => {
    expect(kokonutPath(0, 1)).toBe('M-380 -189C-380 -189 -312 216 152 343C616 470 684 875 684 875');
    expect(kokonutPath(2, -1)).toBe('M-390 -201C-390 -201 -322 204 162 331C626 458 694 863 694 863');
  });

  it('implements reference Perlin noise (zero on lattice points, bounded)', () => {
    expect(P512).toHaveLength(512);
    expect(perlin3(1, 2, 3, P512)).toBe(0);
    for (let i = 0; i < 200; i++) {
      const n = perlin3(i * 0.37, i * 0.11, i * 0.07, P512);
      expect(Math.abs(n)).toBeLessThanOrEqual(1.1);
    }
  });

  it('steps particles with wrap-around and respawn', () => {
    const calls: string[] = [];
    const sink = { moveTo: () => calls.push('m'), lineTo: () => calls.push('l'), addCircle: () => calls.push('c') };
    const s = [0, 0, 1, 149, 150, 50, 50, 1, 0, 120];
    stepParticles(s, 1, 0, 100, 100, 0.003, [sink, sink]);
    for (let i = 0; i < s.length; i += 5) { expect(s[i]).toBeGreaterThanOrEqual(0); expect(s[i]).toBeLessThanOrEqual(100); }
    expect(calls.filter((c) => c === 'c')).toHaveLength(2);
  });

  it('clamps particle settings for mobile and keeps the original defaults', () => {
    const s = normalizeSettings({ kind: 'cyber', particleCount: 2000, particleSizeMin: 3, particleSizeMax: 1 });
    expect(s.particleCount).toBe(PARTICLE_COUNT_MAX);
    expect(s.particleSizeMax).toBeGreaterThanOrEqual(s.particleSizeMin);
    expect(BACKGROUND_REFERENCES.cyber.noiseIntensity).toBe(0.003);
    expect(normalizeSettings({ kind: 'paths', position: -1 }).position).toBe(-1);
    expect(normalizeSettings({ kind: 'paths', position: 5 }).position).toBe(0);
  });

  it('accepts mesh presets as data', () => {
    for (const m of MESH_PRESETS) {
      expect(normalizeSettings({ kind: 'mesh', stops: m.stops }).stops).toEqual(m.stops);
    }
    expect(normalizeSettings({ kind: 'mesh', stops: [{ color: 'bad' }] }).stops.length).toBeGreaterThanOrEqual(2);
  });
});
