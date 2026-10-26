/**
 * SkSL sources for the code-only shader backgrounds, plus their uniform builders.
 * Pure module (no RN/Skia imports) so uniforms can be unit-tested.
 *
 *  - prism     Prismatic Lattice  original
 *  - aurora    Aurora Flow        original (inspired by Ruixen UI's aurora; no code copied)
 *  - halftone  Halftone Clouds    original
 *  - papermesh Paper Mesh         port of MeshGradient from @paper-design/shaders (Apache-2.0,
 *                                 Copyright 2026 Paper, https://shaders.paper.design); see NOTICE
 *  - hive      Hive               original (inspired by Xor's "Hive"; no code copied: license unclear)
 */
import type { BackgroundSettings } from './settings';

export const SHADER_KINDS = ['prism', 'aurora', 'halftone', 'papermesh', 'hive'] as const;
export type ShaderKind = (typeof SHADER_KINDS)[number];

const COMMON = `
uniform float2 res; uniform float time; uniform float scale; uniform float intensity;
uniform float3 colA; uniform float3 colB; uniform float3 colBack;
`;

export const SHADER_SOURCES: Record<ShaderKind, string> = {
  // Kaleidoscopic lattice of rounded cells; folded symmetry + slowly morphing rounded boxes,
  // iridescent tint from a phase-shifted cosine palette.
  prism: `${COMMON}
float sdRound(float2 p, float2 b, float r) { float2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
half4 main(float2 pos) {
  float2 uv = (pos - 0.5 * res) / min(res.x, res.y);
  float a = atan(uv.y, uv.x); float l = length(uv);
  float seg = 6.2831853 / 6.0;
  a = abs(mod(a, seg) - 0.5 * seg);
  float2 p = float2(cos(a), sin(a)) * l * (3.0 + 5.0 * scale);
  float2 cell = floor(p); float2 f = fract(p) - 0.5;
  float morph = 0.5 + 0.5 * sin(time * 0.4 + cell.x * 1.3 + cell.y * 2.1);
  float d = sdRound(f, float2(0.32 + 0.08 * morph), 0.08 + 0.18 * morph);
  float edge = smoothstep(0.04, 0.0, abs(d));
  float fill = smoothstep(0.02, -0.02, d);
  float phase = l * 3.0 + time * 0.15 + (cell.x + cell.y) * 0.25;
  float3 irid = 0.5 + 0.5 * cos(6.2831853 * (phase + float3(0.0, 0.33, 0.67)));
  float3 tint = mix(colA, colB, 0.5 + 0.5 * sin(phase * 2.0));
  float3 col = colBack + fill * tint * 0.35 + edge * mix(tint, irid, 0.6) * (0.4 + intensity);
  col *= smoothstep(1.4, 0.2, l);
  return half4(half3(clamp(col, 0.0, 1.0)), 1.0);
}`,
  // Flat color field with one soft drifting glow point.
  aurora: `${COMMON}
half4 main(float2 pos) {
  float2 uv = (pos - 0.5 * res) / min(res.x, res.y);
  float2 c = float2(0.35 * sin(time * 0.13), 0.25 * cos(time * 0.17)) + float2(0.1 * sin(time * 0.31), 0.08 * cos(time * 0.23));
  float r = 0.25 + 0.45 * scale;
  float g = exp(-dot(uv - c, uv - c) / (r * r));
  float3 col = mix(colBack, colA, g * (0.5 + intensity * 0.8));
  col = mix(col, colB, g * g * 0.35 * intensity);
  return half4(half3(clamp(col, 0.0, 1.0)), 1.0);
}`,
  // Flowing value-noise clouds, rendered as an ordered-dither monochrome halftone.
  halftone: `${COMMON}
uniform float pxSize;
float hash(float2 p) { p = fract(p * float2(0.3183099, 0.3678794)) + 0.1; p += dot(p, p + 19.19); return fract(p.x * p.y); }
float vnoise(float2 p) { float2 i = floor(p); float2 f = fract(p); float2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + float2(1, 0)), u.x), mix(hash(i + float2(0, 1)), hash(i + float2(1, 1)), u.x), u.y); }
float fbm(float2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }
float bayer2(float2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(float2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
half4 main(float2 pos) {
  float2 cell = floor(pos / pxSize);
  float2 uv = cell * pxSize / min(res.x, res.y) * (1.5 + 3.0 * scale);
  float n = fbm(uv + float2(time * 0.05, time * 0.02));
  n = fbm(uv + n * 1.5 - float2(0.0, time * 0.03));
  float v = smoothstep(0.25, 0.85, n) * (0.6 + intensity * 0.8);
  float on = step(bayer4(cell), v);
  return half4(half3(mix(colBack, colA, on)), 1.0);
}`,
  // Port of @paper-design/shaders MeshGradient (Apache-2.0). Up to 6 colors, distortion,
  // swirl and grain overlay; positions/weights as in the original.
  papermesh: `${COMMON}
uniform float3 c0; uniform float3 c1; uniform float3 c2; uniform float3 c3; uniform float3 c4; uniform float3 c5;
uniform float count; uniform float distortion; uniform float swirl; uniform float grain;
float hash21(float2 p) { p = fract(p * float2(0.3183099, 0.3678794)) + 0.1; p += dot(p, p + 19.19); return fract(p.x * p.y); }
float valueNoise(float2 st) { float2 i = floor(st); float2 f = fract(st);
  float a = hash21(i); float b = hash21(i + float2(1.0, 0.0)); float c = hash21(i + float2(0.0, 1.0)); float d = hash21(i + float2(1.0, 1.0));
  float2 u = f * f * (3.0 - 2.0 * f); return mix(mix(a, b, u.x), mix(c, d, u.x), u.y); }
float2 rotate(float2 uv, float th) { return float2x2(cos(th), sin(th), -sin(th), cos(th)) * uv; }
float2 getPosition(int i, float t) {
  float a = float(i) * 0.37; float b = 0.6 + fract(float(i) / 3.0) * 0.9; float c = 0.8 + fract(float(i + 1) / 4.0);
  return 0.5 + 0.5 * float2(sin(t * b + a), cos(t * c + a * 1.5)); }
float3 pick(int i) { if (i == 0) return c0; if (i == 1) return c1; if (i == 2) return c2; if (i == 3) return c3; if (i == 4) return c4; return c5; }
half4 main(float2 pos) {
  float2 uv = pos / res;
  float2 grainUV = uv * 1000.0 * scale;
  float t = 0.5 * (time + 41.5);
  float radius = smoothstep(0.0, 1.0, length(uv - 0.5));
  float center = 1.0 - radius;
  for (float i = 1.0; i <= 2.0; i++) {
    uv.x += distortion * center / i * sin(t + i * 0.4 * smoothstep(0.0, 1.0, uv.y)) * cos(0.2 * t + i * 2.4 * smoothstep(0.0, 1.0, uv.y));
    uv.y += distortion * center / i * cos(t + i * 2.0 * smoothstep(0.0, 1.0, uv.x));
  }
  float2 uvr = rotate(uv - 0.5, -3.0 * swirl * radius) + 0.5;
  float3 color = float3(0.0); float total = 0.0;
  for (int i = 0; i < 6; i++) {
    if (float(i) >= count) break;
    float dist = pow(length(uvr - getPosition(i, t)), 3.5);
    float w = 1.0 / (dist + 1e-3);
    color += pick(i) * w; total += w;
  }
  color /= max(1e-4, total);
  if (grain > 0.0) {
    float g = valueNoise(rotate(grainUV, 1.0) + float2(3.0));
    g = mix(g, valueNoise(rotate(grainUV, 2.0) + float2(-1.0)), 0.5);
    g = pow(g, 1.3);
    float gv = g * 2.0 - 1.0;
    float s = pow(grain * abs(gv), 0.8);
    color = mix(color, float3(step(0.0, gv)), 0.35 * s);
  }
  return half4(half3(mix(colBack, color, 0.85 + 0.15 * intensity)), 1.0);
}`,
  // Dark field with a glowing hexagonal shape whose edge is spectrally (rainbow) offset.
  hive: `${COMMON}
float sdHex(float2 p, float r) { p = abs(p); return max(dot(p, float2(0.8660254, 0.5)), p.y) - r; }
half4 main(float2 pos) {
  float2 uv = (pos - 0.5 * res) / min(res.x, res.y);
  float rot = time * 0.1;
  uv = float2x2(cos(rot), sin(rot), -sin(rot), cos(rot)) * uv;
  float r = 0.18 + 0.2 * scale + 0.02 * sin(time * 0.7);
  float3 col = colBack;
  for (int k = 0; k < 3; k++) {
    float off = (float(k) - 1.0) * 0.012 * (0.5 + intensity);
    float d = sdHex(uv, r + off);
    float glow = 0.004 / (abs(d) + 0.004) + 0.02 / (abs(d) + 0.05);
    float3 band = k == 0 ? float3(1.0, 0.2, 0.35) : k == 1 ? float3(0.25, 1.0, 0.45) : float3(0.3, 0.45, 1.0);
    col += band * glow * 0.22 * (0.5 + intensity);
  }
  float inside = smoothstep(0.01, -0.01, sdHex(uv, r));
  col += inside * mix(colA, colB, 0.5 + 0.5 * uv.y / r) * 0.25;
  return half4(half3(clamp(col, 0.0, 1.0)), 1.0);
}`,
};

export function hexToUnit(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Uniforms each shader reads (except `time`, supplied per frame). */
export function shaderUniforms(kind: ShaderKind, s: BackgroundSettings, w: number, h: number): Record<string, number | number[]> {
  const base: Record<string, number | number[]> = {
    res: [w, h], scale: s.scale, intensity: s.intensity,
    colA: hexToUnit(s.colorA), colB: hexToUnit(s.colorB), colBack: hexToUnit(s.colorBack),
  };
  if (kind === 'halftone') base.pxSize = 1 + Math.round(s.density * 4);
  if (kind === 'papermesh') {
    const cols = s.stops.slice(0, 6).map((x) => hexToUnit(x.color));
    for (let i = 0; i < 6; i++) base[`c${i}`] = cols[i] ?? cols[cols.length - 1];
    base.count = cols.length;
    base.distortion = s.distortion;
    base.swirl = s.swirl;
    base.grain = s.density;
  }
  return base;
}

/** Names of uniforms declared in a shader source (for consistency tests). */
export function declaredUniforms(source: string): string[] {
  return [...source.matchAll(/uniform\s+\w+\s+([^;]+);/g)].flatMap((m) => m[1].split(',').map((x) => x.trim()));
}
