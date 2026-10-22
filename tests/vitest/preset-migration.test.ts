import { describe, expect, it } from 'vitest';

import { normalizeAppearance } from '../../lib/backgrounds/appearance';
import { BACKGROUND_DEFAULTS, BACKGROUND_REFERENCES, LEGACY_NEUTRAL, migratePreset, normalizePresets, normalizeSettings, PRESET_SCHEMA } from '../../lib/backgrounds/settings';

// A schema-2 preset exactly as the previous release stored it (no chaos/glow/invert/layerColors).
const v2 = (kind: string, extra: Record<string, unknown> = {}) => ({
  id: 'old', name: 'Old look', schema: 2,
  settings: { kind, colorA: '#112233', colorB: '#445566', colorBack: '#000000', speed: 1, density: 0.5, intensity: 0.5, blur: 0, opacity: 1, scale: 0.5, ...extra },
  appearance: { themeId: 'deepIndigo', skinId: 'glass', uiFont: 'system', codeFont: 'system', textScale: 1, iconPack: 'material' },
});

describe('preset migration to schema 3', () => {
  it('fills the new fields with neutral values that keep the old look', () => {
    const [p] = normalizePresets([v2('liquid')]);
    expect(p.schema).toBe(PRESET_SCHEMA);
    expect(p.settings).toMatchObject(LEGACY_NEUTRAL);
    // Old absolute values are kept, including opacity 1 and blur 0.
    expect(p.settings.opacity).toBe(1);
    expect(p.settings.blur).toBe(0);
    // Per-layer colors come from the preset's own colors, not today's defaults.
    expect(p.settings.layerColors[0]).toBe('#112233');
    expect(p.settings.layerColors[1]).toBe('#445566');
    expect(p.settings.layerColors).toHaveLength(6);
  });

  it('keeps hive edge bands red/green/blue as they were hard-coded before', () => {
    const p = migratePreset(v2('hive') as never);
    expect(p.settings.layerColors.slice(2)).toEqual(BACKGROUND_REFERENCES.hive.layerColors.slice(2));
  });

  it('adds default text effects to old appearance data', () => {
    const [p] = normalizePresets([v2('aurora')]);
    expect(p.appearance?.text).toEqual(normalizeAppearance({}).text);
  });

  it('treats stored active settings without the new fields as legacy too', () => {
    const s = normalizeSettings({ kind: 'prism', colorA: '#8f82ff' });
    expect(s.chaos).toBe(0);
    expect(s.glow).toBe(0);
    expect(s.invert).toBe(0);
  });

  it('leaves schema-3 presets and fresh settings untouched', () => {
    const fresh = { id: 'n', name: 'New', schema: 3, settings: { ...BACKGROUND_DEFAULTS.bounce, chaos: 0.7, glow: 0.9, invert: -0.4 } };
    const [p] = normalizePresets(JSON.parse(JSON.stringify([fresh])));
    expect(p.settings).toMatchObject({ chaos: 0.7, glow: 0.9, invert: -0.4 });
    expect(normalizeSettings(null)).toEqual(BACKGROUND_DEFAULTS.gradient);
    expect(normalizeSettings({ kind: 'aurora' }).chaos).toBe(0); // a bare kind is legacy-shaped
  });

  it('drops unknown kinds to the gradient and survives garbage', () => {
    expect(normalizePresets([{ id: 'x', name: 'x', settings: 'nope' }])[0].settings.kind).toBe('gradient');
  });
});
