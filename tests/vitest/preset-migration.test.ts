import { describe, expect, it } from 'vitest';

import { BACKGROUND_DEFAULTS, migratePreset, normalizePresets, PRESET_SCHEMA } from '../../lib/backgrounds/settings';

describe('saved preset migration', () => {
  it('upgrades schema-1 presets without moving their absolute values', () => {
    const v1 = { id: 'a', name: 'Old swirl', settings: { kind: 'swirl', colorFront: '#00ffff', colorB: '#00ffff', colorBack: '#220011', speed: 0.9, pxSize: 4, intensity: 0.5, blur: 0, opacity: 1 } };
    const [p] = normalizePresets([v1]);
    expect(p.schema).toBe(PRESET_SCHEMA);
    expect(p.settings.colorA).toBe('#00ffff');
    expect(p.settings.speed).toBe(0.9);
    expect(p.settings.density).toBeCloseTo(1 / 3, 5);
    expect(p.settings.scale).toBe(BACKGROUND_DEFAULTS.swirl.scale);
    expect('colorFront' in p.settings).toBe(false);
  });

  it('leaves current-schema presets untouched and is idempotent', () => {
    const cur = { id: 'b', name: 'Mine', schema: PRESET_SCHEMA, settings: BACKGROUND_DEFAULTS.prism };
    expect(migratePreset(cur)).toBe(cur);
    const once = normalizePresets([cur]);
    expect(normalizePresets(once)).toEqual(once);
  });
});
