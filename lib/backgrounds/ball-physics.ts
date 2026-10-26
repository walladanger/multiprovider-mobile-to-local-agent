/**
 * Light-ball physics for the ball styles (pure, worklet-safe, unit-tested).
 * Coordinates match the shader: uv = (pos - 0.5 * res) / min(res), so the visible area is
 * [-ax, ax] x [-ay, ay] with ax = 0.5 * w / min(w, h), ay = 0.5 * h / min(w, h).
 *
 *  aurora    2 balls drift on soft springs and collide softly; overlapping colors blend
 *  gradient3 3 large balls wander slowly; colors blend everywhere (inverse-distance)
 *  bounce    elastic billiards: walls and ball-ball collisions conserve momentum
 *  orbit     mutual gravity around a center well; close passes merge and slingshot
 *  repel     balls push each other away; hard close approaches emit a shockwave ring
 */
export const BALL_MODES = ['aurora', 'gradient3', 'bounce', 'orbit', 'repel'] as const;
export type BallMode = (typeof BALL_MODES)[number];
export const MAX_BALLS = 6;
/** Per ball: x, y, vx, vy, impact (0..1, decays). */
export const BALL_STRIDE = 5;

export type BallSim = {
  /** BALL_STRIDE numbers per ball. */
  balls: number[];
  /** Shockwave: x, y, age (s), strength (0 = none). */
  shock: number[];
  time: number;
};

export function ballCount(mode: BallMode, density: number): number {
  'worklet';
  if (mode === 'aurora') return 2;
  if (mode === 'gradient3') return 3;
  return Math.max(2, Math.min(MAX_BALLS, 2 + Math.round(density * 4)));
}

export function ballRadius(mode: BallMode, scale: number, i: number): number {
  'worklet';
  const v = 1 - 0.12 * (i % 3);
  if (mode === 'aurora') return (0.3 + 0.3 * scale) * v;
  if (mode === 'gradient3') return (0.4 + 0.3 * scale) * v;
  if (mode === 'orbit') return (0.1 + 0.12 * scale) * v;
  return (0.09 + 0.11 * scale) * v;
}

/** Deterministic pseudo-random in [0, 1). */
function rnd(n: number): number {
  'worklet';
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function initBalls(mode: BallMode, ax: number, ay: number, seed = 1): BallSim {
  'worklet';
  const balls: number[] = [];
  for (let i = 0; i < MAX_BALLS; i++) {
    const a = (i / MAX_BALLS) * Math.PI * 2 + seed;
    const r = mode === 'orbit' ? 0.25 + 0.15 * rnd(i + seed) : 0.5;
    const x = Math.cos(a) * ax * r;
    const y = Math.sin(a) * ay * r;
    // Orbit starts tangential so the system circulates; others get a random heading.
    const sp = mode === 'bounce' ? 0.35 : mode === 'repel' ? 0.15 : mode === 'orbit' ? 0.45 : 0.05;
    const h = mode === 'orbit' ? a + Math.PI / 2 : rnd(i * 7 + seed) * Math.PI * 2;
    balls.push(x, y, Math.cos(h) * sp, Math.sin(h) * sp, 0);
  }
  return { balls, shock: [0, 0, 0, 0], time: 0 };
}

/** Wander targets for the soft (aurora / gradient3) modes. */
function target(i: number, t: number, ax: number, ay: number): [number, number] {
  'worklet';
  const fi = i + 1;
  return [ax * 0.55 * Math.sin(t * (0.21 + 0.05 * fi) + fi * 1.7), ay * 0.5 * Math.cos(t * (0.17 + 0.04 * fi) + fi * 2.3)];
}

/**
 * Advances the simulation by dt seconds (already multiplied by the speed setting), in place.
 * chaos 0..1 adds random kicks. Returns the strongest impact this step (0..1).
 */
export function stepBalls(sim: BallSim, mode: BallMode, n: number, dt: number, ax: number, ay: number, scale: number, chaos: number, random: () => number = Math.random): number {
  'worklet';
  const b = sim.balls;
  const h = Math.min(dt, 1 / 20);
  if (h <= 0) return 0;
  sim.time += h;
  let strongest = 0;
  // Forces.
  for (let i = 0; i < n; i++) {
    const o = i * BALL_STRIDE;
    let fx = 0; let fy = 0;
    if (mode === 'aurora' || mode === 'gradient3') {
      const [tx, ty] = target(i, sim.time, ax, ay);
      fx += (tx - b[o]) * 0.9; fy += (ty - b[o + 1]) * 0.9;
      fx -= b[o + 2] * 0.8; fy -= b[o + 3] * 0.8;
      if (mode === 'aurora') {
        // Gentle mutual pull so the two balls keep meeting.
        const j = (i + 1) % n; const p = j * BALL_STRIDE;
        fx += (b[p] - b[o]) * 0.12; fy += (b[p + 1] - b[o + 1]) * 0.12;
      }
    } else if (mode === 'orbit') {
      // Center well plus softened mutual gravity.
      const d2c = b[o] * b[o] + b[o + 1] * b[o + 1] + 0.02;
      fx -= (b[o] / Math.sqrt(d2c)) * 0.35 / d2c * 0.1 + b[o] * 0.3;
      fy -= (b[o + 1] / Math.sqrt(d2c)) * 0.35 / d2c * 0.1 + b[o + 1] * 0.3;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const p = j * BALL_STRIDE;
        const dx = b[p] - b[o]; const dy = b[p + 1] - b[o + 1];
        const d2 = dx * dx + dy * dy + 0.01;
        const f = 0.02 / (d2 * Math.sqrt(d2));
        fx += dx * f; fy += dy * f;
      }
    } else if (mode === 'repel') {
      fx -= b[o] * 0.6; fy -= b[o + 1] * 0.6;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const p = j * BALL_STRIDE;
        const dx = b[o] - b[p]; const dy = b[o + 1] - b[p + 1];
        const d2 = dx * dx + dy * dy + 0.005;
        const f = 0.012 / (d2 * Math.sqrt(d2));
        fx += dx * f; fy += dy * f;
      }
      fx -= b[o + 2] * 0.15; fy -= b[o + 3] * 0.15;
    }
    if (chaos > 0) { fx += (random() - 0.5) * chaos * 3; fy += (random() - 0.5) * chaos * 3; }
    b[o + 2] += fx * h; b[o + 3] += fy * h;
  }
  // Integrate, walls, impact decay.
  for (let i = 0; i < n; i++) {
    const o = i * BALL_STRIDE;
    const r = ballRadius(mode, scale, i);
    const vmax = 1.6;
    const v = Math.hypot(b[o + 2], b[o + 3]);
    if (v > vmax) { b[o + 2] *= vmax / v; b[o + 3] *= vmax / v; }
    if (mode === 'bounce' && v < 0.2) { const k = 0.2 / Math.max(v, 1e-4); b[o + 2] *= k; b[o + 3] *= k; }
    b[o] += b[o + 2] * h; b[o + 1] += b[o + 3] * h;
    const wx = mode === 'bounce' ? ax - r : ax; const wy = mode === 'bounce' ? ay - r : ay;
    if (b[o] > wx) { b[o] = wx; if (b[o + 2] > 0) { strongest = Math.max(strongest, hit(b, o, Math.abs(b[o + 2]) * 0.5)); b[o + 2] = -b[o + 2]; } }
    if (b[o] < -wx) { b[o] = -wx; if (b[o + 2] < 0) { strongest = Math.max(strongest, hit(b, o, Math.abs(b[o + 2]) * 0.5)); b[o + 2] = -b[o + 2]; } }
    if (b[o + 1] > wy) { b[o + 1] = wy; if (b[o + 3] > 0) { strongest = Math.max(strongest, hit(b, o, Math.abs(b[o + 3]) * 0.5)); b[o + 3] = -b[o + 3]; } }
    if (b[o + 1] < -wy) { b[o + 1] = -wy; if (b[o + 3] < 0) { strongest = Math.max(strongest, hit(b, o, Math.abs(b[o + 3]) * 0.5)); b[o + 3] = -b[o + 3]; } }
    b[o + 4] *= Math.exp(-h * 2.5);
  }
  // Pair collisions.
  if (mode !== 'gradient3') {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const o = i * BALL_STRIDE; const p = j * BALL_STRIDE;
        const ri = ballRadius(mode, scale, i); const rj = ballRadius(mode, scale, j);
        const reach = mode === 'aurora' ? (ri + rj) * 0.55 : ri + rj;
        const dx = b[p] - b[o]; const dy = b[p + 1] - b[o + 1];
        const d = Math.hypot(dx, dy);
        if (d >= reach || d < 1e-6) continue;
        const nx = dx / d; const ny = dy / d;
        const rel = (b[o + 2] - b[p + 2]) * nx + (b[o + 3] - b[p + 3]) * ny; // closing speed (> 0 = approaching)
        const mi = ri * ri; const mj = rj * rj;
        // Separate overlap proportionally to mass.
        const push = (reach - d) / (mi + mj);
        b[o] -= nx * push * mj; b[o + 1] -= ny * push * mj; b[p] += nx * push * mi; b[p + 1] += ny * push * mi;
        if (rel <= 0) continue;
        const e = mode === 'bounce' ? 1 : mode === 'orbit' ? 0.2 : mode === 'repel' ? 0.9 : 0.4;
        const jImp = ((1 + e) * rel) / (1 / mi + 1 / mj);
        b[o + 2] -= (jImp / mi) * nx; b[o + 3] -= (jImp / mi) * ny;
        b[p + 2] += (jImp / mj) * nx; b[p + 3] += (jImp / mj) * ny;
        const strength = Math.min(1, rel * 1.2);
        strongest = Math.max(strongest, strength);
        b[o + 4] = Math.max(b[o + 4], strength); b[p + 4] = Math.max(b[p + 4], strength);
        if (mode === 'repel' && strength > 0.15 && (sim.shock[3] <= 0.02 || sim.shock[2] > 1.2)) {
          sim.shock[0] = b[o] + nx * d * 0.5; sim.shock[1] = b[o + 1] + ny * d * 0.5; sim.shock[2] = 0; sim.shock[3] = strength;
        }
      }
    }
  }
  if (sim.shock[3] > 0) { sim.shock[2] += h; if (sim.shock[2] > 2.5) sim.shock[3] = 0; }
  return strongest;
}

function hit(b: number[], o: number, s: number): number {
  'worklet';
  const v = Math.min(1, s);
  b[o + 4] = Math.max(b[o + 4], v);
  return v;
}

/** Packs the sim into shader uniforms b0..b5 (x, y, radius, impact) and shock. */
export function ballUniforms(sim: BallSim, mode: BallMode, n: number, scale: number): Record<string, number[]> {
  'worklet';
  const out: Record<string, number[]> = {};
  for (let i = 0; i < MAX_BALLS; i++) {
    const o = i * BALL_STRIDE;
    out[`b${i}`] = i < n ? [sim.balls[o], sim.balls[o + 1], ballRadius(mode, scale, i), sim.balls[o + 4]] : [0, 0, 0, 0];
  }
  out.shock = [sim.shock[0], sim.shock[1], sim.shock[2], sim.shock[3]];
  return out;
}
