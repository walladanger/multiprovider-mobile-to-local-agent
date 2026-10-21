/**
 * UI offsets: every slider shows -100..+100 relative to OUR default (0 = our variant,
 * never the reference). Values are stored absolute; offsets are only a view.
 */
export const SLIDER_RANGES = {
  speed: [0, 2], density: [0, 1], intensity: [0, 1], blur: [0, 20], opacity: [0, 1], scale: [0, 1], distortion: [0, 1], swirl: [0, 1],
  particleCount: [50, 1200], noiseIntensity: [0.0005, 0.01], particleSizeMin: [0.2, 4], particleSizeMax: [0.5, 6],
} as const;
export type SliderKey = keyof typeof SLIDER_RANGES;

export function toOffset(value: number, def: number, min: number, max: number): number {
  const span = value >= def ? max - def : def - min;
  if (span <= 0) return 0;
  return Math.max(-100, Math.min(100, Math.round(((value - def) / span) * 100)));
}

export function fromOffset(offset: number, def: number, min: number, max: number): number {
  const o = Math.max(-100, Math.min(100, offset));
  const v = o >= 0 ? def + (o / 100) * (max - def) : def + (o / 100) * (def - min);
  return Math.round(v * 10000) / 10000;
}
