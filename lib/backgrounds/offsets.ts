/**
 * UI offsets: every slider shows -100..+100 relative to OUR default (0 = our variant,
 * never the reference). Values are stored absolute; offsets are only a view.
 * Every default sits strictly inside its range, so both directions change the value
 * (tests/vitest/slider-ranges.test.ts).
 */
import type { BackgroundKind } from './settings';

export const SLIDER_RANGES = {
  speed: [0, 2], density: [0, 1], intensity: [0, 1], blur: [0, 20], opacity: [0, 1], scale: [0, 1], distortion: [0, 1], swirl: [0, 1],
  chaos: [0, 1], glow: [0, 1], invert: [-1, 1],
  particleCount: [50, 1200], noiseIntensity: [0.0005, 0.01], particleSizeMin: [0.2, 4], particleSizeMax: [0.5, 6],
} as const;
export type SliderKey = keyof typeof SLIDER_RANGES;

/** Range for one slider on one style (mesh blur goes much higher because it is a soft-blob look). */
export function sliderRange(kind: BackgroundKind, key: SliderKey): [number, number] {
  const [min, max] = SLIDER_RANGES[key];
  if (key === 'blur' && kind === 'mesh') return [min, 120];
  // Dither/pixel styles turn to mush long before 20px; a shorter range keeps every step visible.
  if (key === 'blur' && (kind === 'swirl' || kind === 'halftone')) return [min, 8];
  return [min, max];
}

export function toOffset(value: number, def: number, min: number, max: number): number {
  const span = value >= def ? max - def : def - min;
  if (span <= 0) return 0;
  return Math.max(-100, Math.min(100, Math.round(((value - def) / span) * 100)));
}

export function fromOffset(offset: number, def: number, min: number, max: number): number {
  const o = Math.max(-100, Math.min(100, offset));
  const v = o >= 0 ? def + (o / 100) * (max - def) : def + (o / 100) * (def - min);
  // 6 decimals: tiny ranges (noise frequency 0.0005..0.01) still round-trip to the same offset.
  return Math.round(v * 1e6) / 1e6;
}
