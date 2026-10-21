import { describe, expect, it } from 'vitest';

import { BUILTIN_PRESETS, presetThumbnail } from '../../lib/backgrounds/builtin-presets';
import { MESH_PRESETS } from '../../lib/backgrounds/mesh-presets';
import { BACKGROUND_DEFAULTS, normalizePresets, savePreset } from '../../lib/backgrounds/settings';
import { declaredUniforms, SHADER_KINDS, SHADER_SOURCES, shaderUniforms } from '../../lib/backgrounds/shader-sources';

describe('shader background presets', () => {
  it.each(SHADER_KINDS)('%s supplies exactly the uniforms its SkSL declares', (kind) => {
    const declared = declaredUniforms(SHADER_SOURCES[kind]).sort();
    const supplied = [...Object.keys(shaderUniforms(kind, BACKGROUND_DEFAULTS[kind], 200, 400)), 'time'].sort();
    expect(supplied).toEqual(declared);
    expect(SHADER_SOURCES[kind]).toContain('half4 main(float2 pos)');
  });

  it.each(BUILTIN_PRESETS.map((p) => [p.id, p] as const))('%s has a thumbnail preview of valid colors', (_id, preset) => {
    const thumb = presetThumbnail(preset);
    expect(thumb.length).toBeGreaterThanOrEqual(2);
    for (const c of thumb) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('includes all requested presets, the deep-blue aurora variant and Soft Mesh', () => {
    const ids = BUILTIN_PRESETS.map((p) => p.id);
    for (const id of ['prismaticLattice', 'auroraFlow', 'auroraDeepBlue', 'halftoneClouds', 'paperMesh', 'hive', 'softMesh']) expect(ids).toContain(id);
    expect(MESH_PRESETS.find((m) => m.id === 'softMesh')!.stops.map((s) => s.color)).toEqual(['#14b8a6', '#3b82f6', '#8b5cf6']);
    const paper = BUILTIN_PRESETS.find((p) => p.id === 'paperMesh')!.settings;
    expect(paper.stops.length).toBeGreaterThanOrEqual(4);
  });

  it('round-trips shader settings through saved presets', () => {
    const s = { ...BACKGROUND_DEFAULTS.papermesh, scale: 0.8, distortion: 0.3, swirl: 0.6 };
    const restored = normalizePresets(JSON.parse(JSON.stringify(savePreset([], 'P', s, 'id'))))[0].settings;
    expect(restored).toMatchObject({ kind: 'papermesh', scale: 0.8, distortion: 0.3, swirl: 0.6 });
  });
});
