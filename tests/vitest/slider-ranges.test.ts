import { describe, expect, it } from 'vitest';

import { fromOffset, sliderRange, SLIDER_RANGES, toOffset, type SliderKey } from '../../lib/backgrounds/offsets';
import { STYLE_EXTRAS, UNIFIED_PARAMS } from '../../lib/backgrounds/params';
import { BACKGROUND_DEFAULTS, BACKGROUND_KINDS, normalizeSettings } from '../../lib/backgrounds/settings';

const sliderKeys = (kind: (typeof BACKGROUND_KINDS)[number]): SliderKey[] => [...UNIFIED_PARAMS, ...(STYLE_EXTRAS[kind] ?? [])];
const cases = BACKGROUND_KINDS.flatMap((kind) => sliderKeys(kind).map((key) => [kind, key] as const));

describe('slider ranges: every default sits inside its range so both directions work', () => {
  it.each(cases)('%s / %s', (kind, key) => {
    const [min, max] = sliderRange(kind, key);
    const def = BACKGROUND_DEFAULTS[kind][key];
    expect(def).toBeGreaterThan(min);
    expect(def).toBeLessThan(max);
    const span = max - min;
    const up = fromOffset(100, def, min, max);
    const down = fromOffset(-100, def, min, max);
    // A real, visible change both ways: at least 5% of the full range.
    expect(up - def).toBeGreaterThanOrEqual(span * 0.05);
    expect(def - down).toBeGreaterThanOrEqual(span * 0.05);
    // The stored value survives normalization (no hidden clamp) and the offset reads back.
    const s = normalizeSettings({ ...BACKGROUND_DEFAULTS[kind], [key]: fromOffset(50, def, min, max) });
    expect(toOffset(s[key], def, min, max)).toBe(50);
    const s2 = normalizeSettings({ ...BACKGROUND_DEFAULTS[kind], [key]: fromOffset(-50, def, min, max) });
    expect(toOffset(s2[key], def, min, max)).toBe(-50);
    expect(toOffset(def, def, min, max)).toBe(0);
  });

  it('opacity actually moves up and down from its default on every style', () => {
    const [min, max] = SLIDER_RANGES.opacity;
    for (const kind of BACKGROUND_KINDS) {
      const def = BACKGROUND_DEFAULTS[kind].opacity;
      expect(def).toBeLessThan(1);
      const higher = normalizeSettings({ ...BACKGROUND_DEFAULTS[kind], opacity: fromOffset(100, def, min, max) }).opacity;
      const lower = normalizeSettings({ ...BACKGROUND_DEFAULTS[kind], opacity: fromOffset(-60, def, min, max) }).opacity;
      expect(higher).toBe(1);
      expect(higher).toBeGreaterThan(def);
      expect(lower).toBeLessThan(def);
      expect(toOffset(higher, def, min, max)).toBe(100);
      expect(toOffset(lower, def, min, max)).toBe(-60);
    }
  });

  it('invert is signed: both directions are real effects', () => {
    const [min, max] = SLIDER_RANGES.invert;
    expect(min).toBe(-1);
    expect(max).toBe(1);
    expect(fromOffset(-100, BACKGROUND_DEFAULTS.aurora.invert, min, max)).toBe(-1);
  });
});
