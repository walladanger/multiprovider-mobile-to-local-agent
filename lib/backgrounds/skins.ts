/** Style skins: shape and surface treatment applied through theme tokens. Pure module. */
export const SKIN_IDS = ['glass', 'solid', 'crisp', 'compact'] as const;
export type SkinId = (typeof SKIN_IDS)[number];
export const DEFAULT_SKIN: SkinId = 'glass';

export type Skin = {
  id: SkinId;
  /** Multiplier for corner radii. */
  radiusScale: number;
  /** Panel fill alpha (glass is translucent, solid is near-opaque). */
  panelAlpha: number;
  /** Whether panels use a backdrop blur. */
  blur: boolean;
  /** White border alpha. */
  borderAlpha: number;
  /** Multiplier for paddings / gaps (density). */
  spacingScale: number;
};

export const SKINS: Record<SkinId, Skin> = {
  glass: { id: 'glass', radiusScale: 1, panelAlpha: 0.55, blur: true, borderAlpha: 0.1, spacingScale: 1 },
  solid: { id: 'solid', radiusScale: 1, panelAlpha: 0.9, blur: false, borderAlpha: 0.08, spacingScale: 1 },
  crisp: { id: 'crisp', radiusScale: 0.4, panelAlpha: 0.7, blur: true, borderAlpha: 0.22, spacingScale: 1 },
  compact: { id: 'compact', radiusScale: 0.7, panelAlpha: 0.65, blur: true, borderAlpha: 0.12, spacingScale: 0.8 },
};

export const isSkinId = (v: unknown): v is SkinId => typeof v === 'string' && (SKIN_IDS as readonly string[]).includes(v);
