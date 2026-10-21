import { describe, expect, it } from 'vitest';

import { BACKGROUND_DEFAULTS, deletePreset, normalizePresets, normalizeSettings, renamePreset, savePreset } from '../../lib/backgrounds/settings';

describe('background settings', () => {
  it('normalizes unknown input to defaults and clamps ranges', () => {
    expect(normalizeSettings(null)).toEqual(BACKGROUND_DEFAULTS.gradient);
    const s = normalizeSettings({ kind: 'swirl', speed: 9, opacity: -1, colorA: 'red' });
    expect(s.kind).toBe('swirl');
    expect(s.speed).toBe(2);
    expect(s.opacity).toBe(0);
    expect(s.colorA).toBe(BACKGROUND_DEFAULTS.swirl.colorA);
  });

  it('saves, overwrites by name, renames and deletes presets', () => {
    let list = savePreset([], ' Night ', BACKGROUND_DEFAULTS.liquid, 'a');
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Night');
    list = savePreset(list, 'Night', BACKGROUND_DEFAULTS.paths, 'b');
    expect(list).toHaveLength(1);
    expect(list[0].settings.kind).toBe('paths');
    list = savePreset(list, 'Day', BACKGROUND_DEFAULTS.swirl, 'c');
    expect(renamePreset(list, 'c', 'Night')).toBe(list);
    list = renamePreset(list, 'c', 'Dawn');
    expect(list.map((p) => p.name)).toEqual(['Night', 'Dawn']);
    expect(deletePreset(list, 'a').map((p) => p.id)).toEqual(['c']);
    expect(savePreset(list, '   ', BACKGROUND_DEFAULTS.swirl)).toBe(list);
  });

  it('drops malformed stored presets', () => {
    expect(normalizePresets([{ id: 'x', name: 'ok', settings: {} }, { id: 1 }, null])).toHaveLength(1);
    expect(normalizePresets('nope')).toEqual([]);
  });
});
