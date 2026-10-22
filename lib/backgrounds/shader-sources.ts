/**
 * SkSL sources for the shader backgrounds, plus their uniform builders.
 * Pure module (no RN/Skia imports) so uniforms can be unit-tested.
 * All shaders here are original work unless noted:
 *
 *  - liquid    Liquid glow        original approximation of "liquid Shader" by Freedom (no code copied)
 *  - swirl     Pixel swirl        original approximation of Ali Imam's "Swirl" dithering look (no code copied)
 *  - prism     Prismatic Lattice  original
 *  - balls     Aurora / 3-ball gradient / Bounce / Orbit / Repel  original (positions come from ball-physics.ts)
 *  - halftone  Halftone Clouds    original
 *  - papermesh Paper Mesh         port of MeshGradient from @paper-design/shaders (Apache-2.0,
 *                                 Copyright 2026 Paper, https://shaders.paper.design); see NOTICE
 *  - hive      Hive               original (inspired by Xor's "Hive"; no code copied: license unclear)
 *  - waves, starfield, plasma     original
 *
 * Shared uniforms: chaos (domain warp / turbulence), glow (edge + impact glow), invert (-1..1),
 * density, and l0..l5 (one color per layer). With chaos = glow = invert = 0 every shader renders
 * exactly its pre-schema-3 look, which is what migrated presets use.
 */
import { BALL_MODES, MAX_BALLS, type BallMode } from './ball-physics';
import { LAYER_COUNTS, type BackgroundSettings } from './settings';

export const SHADER_KINDS = ['liquid', 'swirl', 'prism', 'halftone', 'papermesh', 'hive', 'waves', 'starfield', 'plasma'] as const;
export type ShaderKind = (typeof SHADER_KINDS)[number];
export const BALL_KINDS = BALL_MODES;
export type BallKind = BallMode;

const COMMON = `
uniform float2 res; uniform float time; uniform float scale; uniform float intensity; uniform float density;
uniform float chaos; uniform float glow; uniform float invert;
uniform float3 colBack; uniform float3 l0; uniform float3 l1; uniform float3 l2; uniform float3 l3; uniform float3 l4; uniform float3 l5;
float3 layer(int i) { if (i == 0) return l0; if (i == 1) return l1; if (i == 2) return l2; if (i == 3) return l3; if (i == 4) return l4; return l5; }
float2 warp(float2 uv, float k) {
  return uv + chaos * k * float2(sin(uv.y * 5.3 + time * 0.9) + 0.5 * sin(uv.y * 11.1 - time * 1.7), cos(uv.x * 4.7 - time * 0.8) + 0.5 * cos(uv.x * 9.7 + time * 1.3));
}
half4 finish(float3 c) {
  c = clamp(c, 0.0, 1.0);
  if (invert > 0.0) c = mix(c, 1.0 - c, invert);
  else if (invert < 0.0) c = mix(c, clamp(float3(dot(c, float3(0.6667))) - c, 0.0, 1.0), -invert);
  return half4(half3(c), 1.0);
}
`;

const DITHER = `
float bayer2(float2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(float2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
`;

const NOISE = `
float hash(float2 p) { p = fract(p * float2(0.3183099, 0.3678794)) + 0.1; p += dot(p, p + 19.19); return fract(p.x * p.y); }
float vnoise(float2 p) { float2 i = floor(p); float2 f = fract(p); float2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + float2(1, 0)), u.x), mix(hash(i + float2(0, 1)), hash(i + float2(1, 1)), u.x), u.y); }
`;

export const SHADER_SOURCES: Record<ShaderKind, string> = {
  // Metaball blobs (one color per blob); glow lights up where two blobs' fields overlap (they touch).
  liquid: `${COMMON}
half4 main(float2 pos) {
  float2 uv = warp((pos - 0.5 * res) / min(res.x, res.y), 0.05);
  float blobs = 2.0 + floor(density * 4.0 + 0.5);
  float field = 0.0; float3 acc = float3(0.0); float fmax = 0.0; float fsec = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    if (fi >= blobs) break;
    float2 c = 0.42 * float2(sin(time * (0.31 + 0.07 * fi) + fi * 1.7), cos(time * (0.27 + 0.05 * fi) + fi * 2.3));
    float r = (0.18 + 0.05 * sin(time * 0.5 + fi)) * (0.6 + 0.8 * scale);
    float f = r * r / (dot(uv - c, uv - c) + 1e-3);
    field += f; acc += layer(i) * f;
    if (f > fmax) { fsec = fmax; fmax = f; } else if (f > fsec) { fsec = f; }
  }
  float3 blob = acc / max(field, 1e-3);
  float core = smoothstep(0.9, 1.6, field);
  float g = clamp(field * 0.35, 0.0, 1.0) * (0.4 + intensity);
  float3 col = colBack + blob * g * 0.6 + blob * core * (0.5 + 0.5 * intensity);
  // Contact glow: strongest where the second-strongest blob is as strong as the first.
  float contact = smoothstep(0.25, 0.9, fsec) * smoothstep(0.4, 1.0, fsec / max(fmax, 1e-3));
  col += (blob + 0.25) * contact * glow * 0.9;
  return finish(col);
}`,
  // 4x4 Bayer-dithered swirl, one color per arm; glow brightens the dither edge.
  swirl: `${COMMON}${DITHER}
uniform float pxSize;
half4 main(float2 pos) {
  float2 cell = floor(pos / pxSize);
  float2 p = cell * pxSize + 0.5 * pxSize;
  float2 uv = warp((p - 0.5 * res) / min(res.x, res.y) * (1.5 - scale), 0.06);
  float l = length(uv);
  float a = atan(uv.y, uv.x);
  float ph = a * 3.0 + 10.0 * pow(l, 0.6) - time * 2.0;
  float shape = 0.5 + 0.5 * sin(ph);
  shape *= smoothstep(1.1, 0.05, l);
  shape = pow(shape, 1.6 - intensity);
  float threshold = bayer4(cell) - 0.5;
  float on = step(0.5, shape + threshold);
  int arm = int(mod(floor((ph + 1.5708) / 6.2831853), 3.0));
  float3 front = layer(arm);
  float edge = (1.0 - smoothstep(0.0, 0.18, abs(shape + threshold - 0.5))) * (0.6 + 0.4 * sin(time * 6.0 + l * 20.0));
  return finish(mix(colBack, front, on) + front * edge * glow * 0.6);
}`,
  // Kaleidoscopic lattice of rounded cells; folded symmetry + slowly morphing rounded boxes,
  // iridescent tint from a phase-shifted cosine palette. Layers: cell tint, edge tint.
  prism: `${COMMON}
float sdRound(float2 p, float2 b, float r) { float2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
half4 main(float2 pos) {
  float2 uv = warp((pos - 0.5 * res) / min(res.x, res.y), 0.04);
  float a = atan(uv.y, uv.x); float l = length(uv);
  float seg = 6.2831853 / (4.0 + floor(density * 4.0 + 0.5));
  a = abs(mod(a, seg) - 0.5 * seg);
  float2 p = float2(cos(a), sin(a)) * l * (3.0 + 5.0 * scale);
  float2 cell = floor(p); float2 f = fract(p) - 0.5;
  float morph = 0.5 + 0.5 * sin(time * 0.4 + cell.x * 1.3 + cell.y * 2.1);
  float d = sdRound(f, float2(0.32 + 0.08 * morph), 0.08 + 0.18 * morph);
  float edge = smoothstep(0.04, 0.0, abs(d));
  float fill = smoothstep(0.02, -0.02, d);
  float phase = l * 3.0 + time * 0.15 + (cell.x + cell.y) * 0.25;
  float3 irid = 0.5 + 0.5 * cos(6.2831853 * (phase + float3(0.0, 0.33, 0.67)));
  float3 tint = mix(l0, l1, 0.5 + 0.5 * sin(phase * 2.0));
  float3 col = colBack + fill * tint * 0.35 + edge * mix(tint, irid, 0.6) * (0.4 + intensity);
  // Edge glow pulses as neighboring cells grow into each other (morph near 1 = cells touch).
  col += mix(l1, irid, 0.5) * (0.012 / (abs(d) + 0.012)) * glow * (0.3 + 0.7 * morph) * 0.5;
  col *= smoothstep(1.4, 0.2, l);
  return finish(col);
}`,
  // Flowing value-noise clouds, rendered as an ordered-dither halftone; dense cores use layer 2.
  halftone: `${COMMON}${NOISE}${DITHER}
uniform float pxSize;
float fbm(float2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }
half4 main(float2 pos) {
  float2 cell = floor(pos / pxSize);
  float2 uv = warp(cell * pxSize / min(res.x, res.y), 0.05) * (1.5 + 3.0 * scale);
  float n = fbm(uv + float2(time * 0.05, time * 0.02));
  n = fbm(uv + n * 1.5 - float2(0.0, time * 0.03));
  float v = smoothstep(0.25, 0.85, n) * (0.6 + intensity * 0.8);
  float b = bayer4(cell);
  float on = step(b, v);
  float core = step(b, v - 0.45);
  float3 col = mix(colBack, mix(l0, l1, core), on);
  float rim = (1.0 - smoothstep(0.0, 0.08, abs(v - 0.5))) * (0.5 + 0.5 * sin(time * 5.0 + n * 30.0));
  return finish(col + l1 * rim * glow * 0.7);
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
  float2 uv = warp(pos / res, 0.03);
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
  return finish(mix(colBack, color, 0.85 + 0.15 * intensity));
}`,
  // Dark field with glowing hexagon outlines; three spectral edge bands (layers 3-5) and a fill (layers 1-2).
  hive: `${COMMON}
float sdHex(float2 p, float r) { p = abs(p); return max(dot(p, float2(0.8660254, 0.5)), p.y) - r; }
half4 main(float2 pos) {
  float2 uv = warp((pos - 0.5 * res) / min(res.x, res.y), 0.04);
  float rot = time * 0.1;
  uv = float2x2(cos(rot), sin(rot), -sin(rot), cos(rot)) * uv;
  float r = 0.18 + 0.2 * scale + 0.02 * sin(time * 0.7);
  float rings = 1.0 + floor(max(0.0, density - 0.45) * 7.0);
  float spread = 0.012 * (0.5 + intensity) * (0.5 + density);
  float3 col = colBack;
  for (int ring = 0; ring < 4; ring++) {
    if (float(ring) >= rings) break;
    float rr = r * (1.0 + 0.55 * float(ring));
    float fade = 1.0 / (1.0 + float(ring));
    for (int k = 0; k < 3; k++) {
      float off = (float(k) - 1.0) * spread;
      float d = sdHex(uv, rr + off);
      float g = 0.004 / (abs(d) + 0.004) + 0.02 / (abs(d) + 0.05);
      col += layer(2 + k) * g * 0.22 * (0.5 + intensity) * fade;
      // Edge shimmer where the bands cross each other.
      col += layer(2 + k) * glow * 0.002 / (abs(d) + 0.002) * (0.5 + 0.5 * sin(time * 3.0 + float(k) * 2.1 + atan(uv.y, uv.x) * 6.0)) * fade;
    }
  }
  float inside = smoothstep(0.01, -0.01, sdHex(uv, r));
  col += inside * mix(l0, l1, 0.5 + 0.5 * uv.y / r) * 0.25;
  return finish(col);
}`,
  // Layered glowing sine ribbons; glow flares where two ribbons cross.
  waves: `${COMMON}
half4 main(float2 pos) {
  float2 uv = warp((pos - 0.5 * res) / min(res.x, res.y), 0.05);
  float count = 3.0 + floor(density * 5.0 + 0.5);
  float3 col = colBack; float prev = 0.0; float xing = 0.0;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float f = 2.0 + fi * 0.7;
    float y = (0.12 + 0.18 * scale) * sin(uv.x * f + time * (0.6 + 0.13 * fi) + fi * 1.9) + (fi - count * 0.5) * 0.08;
    float d = abs(uv.y - y);
    float line = 0.003 / (d + 0.003) + 0.04 * exp(-d * 18.0);
    col += layer(int(mod(fi, 3.0))) * line * (0.35 + 0.6 * intensity);
    xing += min(line, prev); prev = line;
  }
  col += float3(1.0) * clamp(xing, 0.0, 2.0) * glow * 0.35;
  return finish(col);
}`,
  // Warp star field in three depth layers; glow adds halos and streaks.
  starfield: `${COMMON}${NOISE}
half4 main(float2 pos) {
  float2 uv = (pos - 0.5 * res) / min(res.x, res.y);
  float3 col = colBack;
  float grid = 6.0 + density * 22.0;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float z = fract(time * 0.08 * (1.0 + fk * 0.6) + fk * 0.33);
    float depth = mix(2.5, 0.2, z);
    float2 p = warp(uv * depth, 0.05) * grid + fk * 17.0;
    float2 id = floor(p); float2 f = fract(p) - 0.5;
    float h = hash(id + fk);
    if (h > 0.25) {
      float2 o = float2(hash(id + 3.1), hash(id + 7.7)) - 0.5;
      float d = length(f - o * 0.6);
      float size = (0.02 + 0.05 * scale) * (0.5 + h) * (1.0 + z * 2.0);
      float star = smoothstep(size, 0.0, d);
      float halo = 0.01 / (d + 0.01) * 0.08 * (0.5 + h);
      float fade = smoothstep(0.0, 0.25, z) * smoothstep(1.0, 0.85, z);
      col += layer(k) * (star * (0.5 + intensity) + halo * glow * 2.0) * fade;
    }
  }
  return finish(col);
}`,
  // Classic sine plasma mapped through a three-color palette; glow lights the contour ridges.
  plasma: `${COMMON}
half4 main(float2 pos) {
  float2 uv = warp((pos - 0.5 * res) / min(res.x, res.y), 0.08) * (2.0 + density * 6.0) * (0.6 + 0.8 * scale);
  float v = sin(uv.x + time) + sin((uv.y + time) * 0.5) + sin((uv.x + uv.y + time) * 0.5);
  float2 c = uv + 0.5 * float2(sin(time / 3.0), cos(time / 2.0));
  v += sin(sqrt(c.x * c.x + c.y * c.y + 1.0) + time);
  v = 0.5 + 0.125 * v;
  float3 pal = v < 0.5 ? mix(l0, l1, v * 2.0) : mix(l1, l2, v * 2.0 - 1.0);
  float3 col = mix(colBack, pal, 0.35 + 0.6 * intensity);
  float ridge = 1.0 - smoothstep(0.0, 0.04, abs(fract(v * 6.0) - 0.5) - 0.42);
  return finish(col + pal * ridge * glow * 0.6);
}`,
};

/** One shader for every ball style; positions/radii/impacts come from ball-physics.ts each frame. */
export const BALLS_SOURCE = `${COMMON}
uniform float4 b0; uniform float4 b1; uniform float4 b2; uniform float4 b3; uniform float4 b4; uniform float4 b5;
uniform float4 shock; uniform float count; uniform float mode;
float4 ball(int i) { if (i == 0) return b0; if (i == 1) return b1; if (i == 2) return b2; if (i == 3) return b3; if (i == 4) return b4; return b5; }
half4 main(float2 pos) {
  float2 uv = warp((pos - 0.5 * res) / min(res.x, res.y), 0.03);
  float3 acc = float3(0.0); float wsum = 0.0; float field = 0.0; float3 hitc = float3(0.0);
  for (int i = 0; i < 6; i++) {
    if (float(i) >= count) break;
    float4 b = ball(i); float2 d = uv - b.xy; float d2 = dot(d, d); float rr = b.z * b.z;
    float w;
    if (mode < 0.5) { w = exp(-d2 / rr); field += w; }
    else if (mode < 1.5) { w = 1.0 / (pow(d2 / rr, 1.6) + 0.02); }
    else if (mode < 2.5) { w = rr / (d2 + 1e-4); field = max(field, w); } // bounce: solid balls, no merging
    else { w = rr / (d2 + 1e-4); field += w; }                             // orbit / repel: metaballs merge
    acc += layer(i) * w; wsum += w;
    hitc += layer(i) * b.w * exp(-d2 / (rr * 2.2));
  }
  float3 blend = acc / max(wsum, 1e-4);
  float3 col;
  if (mode < 0.5) {
    // Aurora: two soft glows; where they overlap the weighted blend mixes both colors.
    float a = clamp(field, 0.0, 1.0);
    col = mix(colBack, blend, a * (0.55 + 0.45 * intensity)) + blend * field * field * 0.12 * intensity;
  } else if (mode < 1.5) {
    col = mix(colBack, blend, 0.55 + 0.4 * intensity);
  } else {
    float core = smoothstep(0.8, 1.25, field);
    float halo = smoothstep(0.15, 1.0, field);
    col = colBack + blend * (halo * 0.35 * (0.4 + intensity) + core * (0.55 + 0.45 * intensity));
    col += blend * glow * smoothstep(0.3, 0.0, abs(field - 1.0)) * 0.5;
  }
  // Impact flash: tinted by the ball's color with a little white, only where a ball was just hit.
  col += (hitc + 0.3 * float3(max(hitc.r, max(hitc.g, hitc.b)))) * glow * 1.4;
  if (shock.w > 0.0) {
    float dd = length(uv - shock.xy);
    float ring = exp(-pow((dd - shock.z * 0.9) * 16.0, 2.0)) * shock.w * exp(-shock.z * 1.4);
    col += (blend + 0.35) * ring * (0.5 + glow);
  }
  return finish(col);
}`;

export function hexToUnit(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function commonUniforms(s: BackgroundSettings, w: number, h: number): Record<string, number | number[]> {
  const layers = s.layerColors.length ? s.layerColors : [s.colorA, s.colorB];
  const base: Record<string, number | number[]> = {
    res: [w, h], scale: s.scale, intensity: s.intensity, density: s.density, chaos: s.chaos, glow: s.glow, invert: s.invert,
    colBack: hexToUnit(s.colorBack),
  };
  for (let i = 0; i < 6; i++) base[`l${i}`] = hexToUnit(layers[i] ?? layers[layers.length - 1]);
  return base;
}

/** Uniforms each shader reads (except `time`, supplied per frame). `w`/`h` are canvas pixels. */
export function shaderUniforms(kind: ShaderKind, s: BackgroundSettings, w: number, h: number): Record<string, number | number[]> {
  const base = commonUniforms(s, w, h);
  if (kind === 'halftone') base.pxSize = 1 + Math.round(s.density * 4);
  // Full-res pxSize 2..8 -> half-res canvas units 1..4.
  if (kind === 'swirl') base.pxSize = 1 + Math.round(s.density * 3);
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

/** Static uniforms for the ball shader; b0..b5 and shock are filled from the simulation each frame. */
export function ballStaticUniforms(kind: BallKind, s: BackgroundSettings, w: number, h: number, count: number): Record<string, number | number[]> {
  return { ...commonUniforms(s, w, h), count, mode: BALL_MODES.indexOf(kind) };
}

export const BALL_FRAME_UNIFORMS = [...Array.from({ length: MAX_BALLS }, (_, i) => `b${i}`), 'shock'];

/** Names of uniforms declared in a shader source (for consistency tests). */
export function declaredUniforms(source: string): string[] {
  return [...source.matchAll(/uniform\s+\w+\s+([^;]+);/g)].flatMap((m) => m[1].split(',').map((x) => x.trim()));
}

export { LAYER_COUNTS };
