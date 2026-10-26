import { describe, expect, it } from 'vitest';

import { BALL_MODES, ballCount, ballUniforms, initBalls, stepBalls } from '../../lib/backgrounds/ball-physics';
import { BUILTIN_PRESETS } from '../../lib/backgrounds/builtin-presets';
import { hexToHsv, hsvToHex, invertHex, parseHex } from '../../lib/backgrounds/color-math';
import { LAYER_NOUNS, PARAM_SUPPORT, paramSchema, UNIFIED_PARAMS } from '../../lib/backgrounds/params';
import { BACKGROUND_DEFAULTS, BACKGROUND_KINDS, LAYER_COUNTS, patchSettings } from '../../lib/backgrounds/settings';
import { BALL_FRAME_UNIFORMS, BALLS_SOURCE, ballStaticUniforms, declaredUniforms, SHADER_KINDS, SHADER_SOURCES } from '../../lib/backgrounds/shader-sources';
import en from '../../lib/i18n/locales/en/settings.json';

describe('unified parameter schema', () => {
  it.each(BACKGROUND_KINDS)('%s exposes the full slider set with valid values', (kind) => {
    const schema = paramSchema(kind);
    expect(schema.map((p) => p.key)).toEqual([...UNIFIED_PARAMS]);
    for (const key of UNIFIED_PARAMS) expect(typeof BACKGROUND_DEFAULTS[kind][key]).toBe('number');
    for (const key of PARAM_SUPPORT[kind]) expect(UNIFIED_PARAMS).toContain(key);
    expect(LAYER_NOUNS[kind]).toBeTruthy();
    expect(BACKGROUND_DEFAULTS[kind].layerColors).toHaveLength(LAYER_COUNTS[kind]);
  });

  it.each(BUILTIN_PRESETS.map((p) => [p.id, p] as const))('preset %s carries every unified parameter', (_id, p) => {
    for (const key of UNIFIED_PARAMS) expect(Number.isFinite(p.settings[key])).toBe(true);
    expect(p.settings.layerColors).toHaveLength(LAYER_COUNTS[p.settings.kind]);
  });

  it('every style has a name and a one-line description, and aurora no longer uses the gradient text', () => {
    for (const kind of BACKGROUND_KINDS) {
      expect(en.backgrounds.kinds[kind as keyof typeof en.backgrounds.kinds]).toBeTruthy();
      const d = en.backgrounds.descriptions[kind as keyof typeof en.backgrounds.descriptions];
      expect(d).toBeTruthy();
      expect(d).not.toContain('\n');
    }
    expect(en.backgrounds.descriptions.aurora).not.toMatch(/flat color field/i);
    expect(new Set(Object.values(en.backgrounds.descriptions)).size).toBe(Object.keys(en.backgrounds.descriptions).length);
  });

  it('wires chaos, glow, invert and density into every shader that declares them', () => {
    for (const kind of SHADER_KINDS) {
      const declared = declaredUniforms(SHADER_SOURCES[kind]);
      for (const u of ['chaos', 'glow', 'invert', 'density', 'l0']) expect(declared).toContain(u);
      const src = SHADER_SOURCES[kind];
      expect(src).toMatch(/warp\(/);
      expect(src).toMatch(/finish\(/);
      if (PARAM_SUPPORT[kind].includes('glow')) expect(src.split('half4 main')[1]).toMatch(/glow/);
    }
  });

  it('the ball shader gets exactly the uniforms it declares', () => {
    for (const mode of BALL_MODES) {
      const supplied = [...Object.keys(ballStaticUniforms(mode, BACKGROUND_DEFAULTS[mode], 200, 400, 3)), ...BALL_FRAME_UNIFORMS, 'time'].sort();
      expect(supplied).toEqual(declaredUniforms(BALLS_SOURCE).sort());
    }
  });

  it('aurora and Deep Blue differ in more than color', () => {
    const a = BUILTIN_PRESETS.find((p) => p.id === 'auroraFlow')!.settings;
    const b = BUILTIN_PRESETS.find((p) => p.id === 'auroraDeepBlue')!.settings;
    expect(['speed', 'scale', 'glow', 'chaos'].some((k) => a[k as 'speed'] !== b[k as 'speed'])).toBe(true);
    expect(a.layerColors).toHaveLength(2);
  });

  it('theme suggestions re-derive layer colors; layer edits update the primary mirror', () => {
    const s = patchSettings(BACKGROUND_DEFAULTS.bounce, { colorA: '#ff0000', colorB: '#00ff00' });
    expect(s.layerColors[0]).toBe('#ff0000');
    expect(s.layerColors[1]).toBe('#00ff00');
    const t = patchSettings(s, { layerColors: ['#123456', ...s.layerColors.slice(1)] });
    expect(t.colorA).toBe('#123456');
  });
});

describe('ball physics', () => {
  it.each(BALL_MODES)('%s stays bounded and finite', (mode) => {
    const sim = initBalls(mode, 0.5, 1);
    const n = ballCount(mode, 1);
    let seed = 1;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 600; i++) stepBalls(sim, mode, n, 1 / 60, 0.5, 1, 0.5, 0.5, random);
    for (let i = 0; i < n; i++) {
      expect(Number.isFinite(sim.balls[i * 5])).toBe(true);
      expect(Math.abs(sim.balls[i * 5])).toBeLessThanOrEqual(0.5 + 1e-6);
      expect(Math.abs(sim.balls[i * 5 + 1])).toBeLessThanOrEqual(1 + 1e-6);
    }
    expect(Object.keys(ballUniforms(sim, mode, n, 0.5))).toHaveLength(7);
  });

  it('elastic bounce conserves momentum in a head-on collision and reports the impact', () => {
    const sim = initBalls('bounce', 2, 2);
    const b = sim.balls;
    b.splice(0, 10, -0.1, 0, 0.5, 0, 0, 0.1, 0, -0.5, 0, 0);
    const impact = stepBalls(sim, 'bounce', 2, 1 / 60, 2, 2, 0.5, 0);
    expect(impact).toBeGreaterThan(0.5);
    expect(b[2]).toBeLessThan(0);
    expect(b[7]).toBeGreaterThan(0);
  });

  it('repel emits a shockwave on a hard collision', () => {
    const sim = initBalls('repel', 2, 2);
    sim.balls.splice(0, 10, -0.05, 0, 1.2, 0, 0, 0.05, 0, -1.2, 0, 0);
    stepBalls(sim, 'repel', 2, 1 / 60, 2, 2, 0.5, 0);
    expect(sim.shock[3]).toBeGreaterThan(0);
  });
});

describe('color helpers', () => {
  it('round-trips HSV and parses hex input', () => {
    for (const hex of ['#6d5cff', '#00ffff', '#ec4899', '#000000', '#ffffff']) expect(hsvToHex(...hexToHsv(hex))).toBe(hex);
    expect(parseHex('ABC')).toBe('#aabbcc');
    expect(parseHex('#12345')).toBeNull();
  });

  it('inverts both ways', () => {
    expect(invertHex('#000000', 1)).toBe('#ffffff');
    expect(invertHex('#ff0000', 0)).toBe('#ff0000');
    expect(invertHex('#ff0000', -1)).not.toBe('#ff0000');
  });
});
