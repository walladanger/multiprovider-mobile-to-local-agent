import { describe, expect, it } from 'vitest';

import { BUILTIN_PRESETS } from '../../lib/backgrounds/builtin-presets';
import { hueDistance } from '../../lib/backgrounds/color-math';
import { MESH_PRESET_REFERENCES, MESH_PRESETS } from '../../lib/backgrounds/mesh-presets';
import { fromOffset, toOffset } from '../../lib/backgrounds/offsets';
import { BACKGROUND_DEFAULTS, BACKGROUND_KINDS, BACKGROUND_REFERENCES, normalizeSettings } from '../../lib/backgrounds/settings';

const REFERENCED = BACKGROUND_KINDS.filter((k) => k !== 'gradient' && k !== 'video');

describe('defaults are our own variant, never the reference', () => {
  it.each(REFERENCED)('%s default != reference', (kind) => {
    const ref = BACKGROUND_REFERENCES[kind];
    const def = BACKGROUND_DEFAULTS[kind];
    expect(def).not.toEqual(ref);
    expect(normalizeSettings(def)).not.toEqual(normalizeSettings(ref));
    // Colors moved and at least one motion/shape parameter changed.
    expect(def.colorA === ref.colorA && def.colorBack === ref.colorBack).toBe(false);
    const numeric = (['speed', 'density', 'intensity', 'scale', 'distortion', 'swirl', 'particleCount', 'noiseIntensity'] as const).some((k) => def[k] !== ref[k]);
    expect(numeric).toBe(true);
  });

  it('hue shifts saturated colors by roughly 10-25 degrees', () => {
    for (const kind of ['liquid', 'swirl', 'prism', 'aurora', 'halftone', 'papermesh', 'hive', 'mesh'] as const) {
      const d = hueDistance(BACKGROUND_REFERENCES[kind].colorA, BACKGROUND_DEFAULTS[kind].colorA);
      expect(d).toBeGreaterThanOrEqual(9);
      expect(d).toBeLessThanOrEqual(26);
    }
  });

  it('mesh presets and built-ins differ from their references', () => {
    MESH_PRESET_REFERENCES.forEach((ref, i) => expect(MESH_PRESETS[i]).not.toEqual(ref));
    const deep = BUILTIN_PRESETS.find((p) => p.id === 'auroraDeepBlue')!;
    expect(deep.settings.colorA).not.toBe('#2563eb');
  });

  it('offset 0 is the default, and offsets round-trip', () => {
    expect(fromOffset(0, 0.6, 0, 2)).toBe(0.6);
    expect(fromOffset(100, 0.6, 0, 2)).toBe(2);
    expect(fromOffset(-100, 0.6, 0, 2)).toBe(0);
    expect(toOffset(fromOffset(40, 0.3, 0, 1), 0.3, 0, 1)).toBe(40);
    expect(toOffset(BACKGROUND_REFERENCES.swirl.speed, BACKGROUND_DEFAULTS.swirl.speed, 0, 2)).not.toBe(0);
  });
});
