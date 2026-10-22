/**
 * Unified parameter schema: every background style exposes the same slider set (UNIFIED_PARAMS).
 * PARAM_SUPPORT says which ones a style actually uses; the UI marks the rest "no effect on this style".
 * Style-specific extras (particle sizes, Paper Mesh distortion/swirl) are listed in STYLE_EXTRAS.
 */
import { BACKGROUND_KINDS, LAYER_COUNTS, type BackgroundKind } from './settings';
import type { SliderKey } from './offsets';

export const UNIFIED_PARAMS = ['speed', 'intensity', 'scale', 'blur', 'opacity', 'density', 'chaos', 'glow', 'invert'] as const;
export type UnifiedParam = (typeof UNIFIED_PARAMS)[number];

const ALL: readonly UnifiedParam[] = UNIFIED_PARAMS;
const without = (...keys: UnifiedParam[]) => ALL.filter((k) => !keys.includes(k));

export const PARAM_SUPPORT: Record<BackgroundKind, readonly UnifiedParam[]> = {
  // Static gradient: colors only, plus the overlay tint (intensity) and invert.
  gradient: ['intensity', 'opacity', 'invert'],
  video: ['intensity', 'opacity'],
  paths: ALL,
  liquid: ALL,
  swirl: ALL,
  cyber: ALL,
  // Mesh blobs never touch each other visibly through the heavy blur, so there is no edge to glow.
  mesh: without('glow', 'density'),
  prism: ALL,
  // Fixed ball counts (2 and 3), so density has nothing to change.
  aurora: without('density'),
  gradient3: without('density', 'glow'),
  bounce: ALL,
  orbit: ALL,
  repel: ALL,
  halftone: ALL,
  // Paper Mesh blends colors continuously: there are no edges or impacts to glow.
  papermesh: without('glow'),
  hive: ALL,
  waves: ALL,
  starfield: ALL,
  plasma: ALL,
};

export const STYLE_EXTRAS: Partial<Record<BackgroundKind, SliderKey[]>> = {
  cyber: ['particleCount', 'noiseIntensity', 'particleSizeMin', 'particleSizeMax'],
  papermesh: ['distortion', 'swirl'],
};

/** Singular noun used for per-layer color rows ("Ball 1", "Band 2", ...). */
export const LAYER_NOUNS: Record<BackgroundKind, 'ball' | 'blob' | 'layer' | 'band' | 'fan' | 'arm' | 'ribbon' | 'stop'> = {
  gradient: 'layer', video: 'layer', mesh: 'stop', papermesh: 'stop',
  paths: 'fan', liquid: 'blob', swirl: 'arm', cyber: 'layer', prism: 'layer', aurora: 'ball', gradient3: 'ball',
  bounce: 'ball', orbit: 'ball', repel: 'ball', halftone: 'layer', hive: 'band', waves: 'ribbon', starfield: 'layer', plasma: 'band',
};

export function supportsParam(kind: BackgroundKind, key: UnifiedParam): boolean {
  return PARAM_SUPPORT[kind].includes(key);
}

/** Every style: the same unified list, each with a supported flag. */
export function paramSchema(kind: BackgroundKind): { key: UnifiedParam; supported: boolean }[] {
  return UNIFIED_PARAMS.map((key) => ({ key, supported: supportsParam(kind, key) }));
}

export function layerCount(kind: BackgroundKind): number {
  return LAYER_COUNTS[kind];
}

export const ALL_KINDS = BACKGROUND_KINDS;
