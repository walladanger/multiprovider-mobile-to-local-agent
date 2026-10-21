/** Pure math shared by the Skia backgrounds (unit-tested; worklet-safe). */

/** Kokonut UI FloatingPathsBackground path `d` for path i and `position` (1 or -1), viewBox 0 0 696 316. */
export function kokonutPath(i: number, position: number) {
  return `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`;
}

/** Ken Perlin's reference permutation, as in the supplied CyberBackground source. */
const PERM = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180];
export const P512 = Array.from({ length: 512 }, (_, i) => PERM[i & 255]);

export function perlin3(x: number, y: number, z: number, p: number[]) {
  'worklet';
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (t: number, a: number, b: number) => a + t * (b - a);
  const grad = (hash: number, gx: number, gy: number, gz: number) => {
    const hh = hash & 15;
    const u = hh < 8 ? gx : gy;
    const v = hh < 4 ? gy : hh === 12 || hh === 14 ? gx : gz;
    return ((hh & 1) === 0 ? u : -u) + ((hh & 2) === 0 ? v : -v);
  };
  const X = Math.floor(x) & 255; const Y = Math.floor(y) & 255; const Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x); const v = fade(y); const w = fade(z);
  const A = p[X] + Y; const AA = p[A] + Z; const AB = p[A + 1] + Z;
  const B = p[X + 1] + Y; const BA = p[B] + Z; const BB = p[B + 1] + Z;
  return lerp(w,
    lerp(v, lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)), lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))),
    lerp(v, lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)), lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))));
}

type PathSink = { moveTo: (x: number, y: number) => unknown; lineTo: (x: number, y: number) => unknown; addCircle: (x: number, y: number, r: number) => unknown };

/**
 * One CyberBackground animation step, in place. `s` holds [x, y, size, life, maxLife]
 * per particle; each particle is drawn into the bucket for its fade-in/out opacity.
 */
export function stepParticles(s: number[], steps: number, t: number, w: number, h: number, noiseIntensity: number, buckets: PathSink[]) {
  'worklet';
  const n = buckets.length;
  for (let i = 0; i < s.length; i += 5) {
    s[i + 3] += steps;
    if (s[i + 3] > s[i + 4]) { s[i + 3] = 0; s[i] = Math.random() * w; s[i + 1] = Math.random() * h; }
    const angle = perlin3(s[i] * noiseIntensity, s[i + 1] * noiseIntensity, t, P512) * Math.PI * 4;
    const vx = Math.cos(angle) * 2 * steps;
    const vy = Math.sin(angle) * 2 * steps;
    const px = s[i];
    const py = s[i + 1];
    s[i] += vx;
    s[i + 1] += vy;
    if (s[i] < 0) s[i] = w;
    if (s[i] > w) s[i] = 0;
    if (s[i + 1] < 0) s[i + 1] = h;
    if (s[i + 1] > h) s[i + 1] = 0;
    const fade = Math.sin((s[i + 3] / s[i + 4]) * Math.PI);
    const path = buckets[Math.max(0, Math.min(n - 1, Math.floor(fade * n)))];
    // Short stroke along the velocity approximates the original's fading trail.
    if (Math.abs(s[i] - px) < 20 && Math.abs(s[i + 1] - py) < 20) { path.moveTo(px - vx * 2, py - vy * 2); path.lineTo(s[i], s[i + 1]); }
    path.addCircle(s[i], s[i + 1], s[i + 2]);
  }
}
