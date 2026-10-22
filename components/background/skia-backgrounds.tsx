// Web/default stub: Skia (CanvasKit) is not loaded on web, so the registry
// falls back to the static gradient there. Native implementation lives in
// skia-backgrounds.native.tsx.
import type { ComponentType } from 'react';
import type { BackgroundKind, BackgroundSettings } from '@/lib/backgrounds/settings';

export type SkiaKind = Exclude<BackgroundKind, 'gradient' | 'video'>;
export type SkiaBackgroundProps = { settings: BackgroundSettings; width?: number; height?: number };
export const SKIA_BACKGROUNDS: Partial<Record<SkiaKind, ComponentType<SkiaBackgroundProps>>> = {};
