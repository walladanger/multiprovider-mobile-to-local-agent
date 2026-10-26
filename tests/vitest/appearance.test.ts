import { describe, expect, it } from 'vitest';

import { DEFAULT_APPEARANCE, normalizeAppearance, resolveThemeTokens } from '../../lib/backgrounds/appearance';
import { scaledFontSize, TEXT_SCALE_MAX, TEXT_SCALE_MIN } from '../../lib/backgrounds/fonts';
import { ICON_NAMES, isIconName, MATERIAL_ICON_MAP } from '../../lib/backgrounds/icon-map';
import { normalizePresets, savePreset, BACKGROUND_DEFAULTS } from '../../lib/backgrounds/settings';
import { SKIN_IDS, SKINS } from '../../lib/backgrounds/skins';

describe('appearance model', () => {
  it('normalizes unknown values and clamps the text scale', () => {
    expect(normalizeAppearance(undefined)).toEqual(DEFAULT_APPEARANCE);
    const a = normalizeAppearance({ themeId: 'cosmicTeal', skinId: 'nope', uiFont: 'comic', textScale: 5, iconPack: 'tabler' });
    expect(a).toMatchObject({ themeId: 'cosmicTeal', skinId: 'glass', uiFont: 'system', textScale: TEXT_SCALE_MAX, iconPack: 'tabler' });
    expect(normalizeAppearance({ textScale: 0.1 }).textScale).toBe(TEXT_SCALE_MIN);
  });

  it('offers 3-4 skins that change radius, panels, borders and spacing', () => {
    expect(SKIN_IDS.length).toBeGreaterThanOrEqual(3);
    const glass = resolveThemeTokens({ ...DEFAULT_APPEARANCE, skinId: 'glass' });
    const crisp = resolveThemeTokens({ ...DEFAULT_APPEARANCE, skinId: 'crisp' });
    const solid = resolveThemeTokens({ ...DEFAULT_APPEARANCE, skinId: 'solid' });
    const compact = resolveThemeTokens({ ...DEFAULT_APPEARANCE, skinId: 'compact' });
    expect(crisp.radius.lg).toBeLessThan(glass.radius.lg);
    expect(solid.glass.blurIntensity).toBe(0);
    expect(solid.glass.panel).toContain(String(SKINS.solid.panelAlpha));
    expect(compact.spacing.lg).toBeLessThan(glass.spacing.lg);
    expect(crisp.glass.border).not.toBe(glass.glass.border);
  });

  it('maps theme ids to palette tokens', () => {
    expect(resolveThemeTokens({ ...DEFAULT_APPEARANCE, themeId: 'abyssBlue' }).palette.bg).toBe('#071530');
  });

  it('stacks the app text scale on the base size', () => {
    expect(scaledFontSize(16, 1.25)).toBe(20);
    expect(scaledFontSize(16, 9)).toBe(16 * TEXT_SCALE_MAX);
  });

  it('maps every semantic icon name for Material', () => {
    for (const n of ICON_NAMES) expect(MATERIAL_ICON_MAP[n]).toBeTruthy();
    expect(isIconName('settings')).toBe(true);
    expect(isIconName('account')).toBe(false);
  });

  it('stores appearance inside user presets', () => {
    const list = savePreset([], 'Mine', BACKGROUND_DEFAULTS.swirl, 'x', { ...DEFAULT_APPEARANCE, themeId: 'royalPurple', uiFont: 'inter' });
    const restored = normalizePresets(JSON.parse(JSON.stringify(list)));
    expect(restored[0].appearance).toMatchObject({ themeId: 'royalPurple', uiFont: 'inter' });
  });
});
